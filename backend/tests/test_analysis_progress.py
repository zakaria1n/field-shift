"""Progress must be observable by another request while providers are running."""
import threading

from app.data_providers.interfaces import ProviderResult
from app.db.base import get_session_factory
from app.db.models import AnalysisJob, new_id, utcnow_iso
from app.services import analysis


def test_progress_is_persisted_during_provider_work(field_with_profile, monkeypatch):
    client, field_id = field_with_profile
    entered_climate, release_climate = threading.Event(), threading.Event()
    entered_soil, release_soil = threading.Event(), threading.Event()

    def climate(*_args):
        entered_climate.set()
        assert release_climate.wait(10)
        return ProviderResult(source_id="nasa_power", status="unavailable", detail="test outage")

    def soil(*_args):
        entered_soil.set()
        assert release_soil.wait(10)
        return ProviderResult(source_id="soilgrids", status="unavailable", detail="test outage")

    monkeypatch.setattr(analysis.nasa_power, "fetch_climate", climate)
    monkeypatch.setattr(analysis.soilgrids, "fetch_soil", soil)
    job_id = new_id("job")
    with get_session_factory()() as session:
        session.add(AnalysisJob(id=job_id, field_id=field_id, status="queued", created_at=utcnow_iso()))
        session.commit()
    worker = threading.Thread(target=analysis.run_analysis, args=(job_id, field_id))
    worker.start()
    try:
        assert entered_climate.wait(10)
        job = client.get(f"/api/v1/analyses/{job_id}").json()
        stages = {stage["key"]: stage["status"] for stage in job["stages"]}
        assert stages["geometry"] == "complete"
        assert stages["climate"] == "running"
        assert stages["soil"] == "pending"

        release_climate.set()
        assert entered_soil.wait(10)
        job = client.get(f"/api/v1/analyses/{job_id}").json()
        stages = {stage["key"]: stage["status"] for stage in job["stages"]}
        assert stages["climate"] == "failed"
        assert stages["soil"] == "running"
        assert next(source for source in job["sources"] if source["source_id"] == "nasa_power")["status"] == "unavailable"
    finally:
        release_climate.set()
        release_soil.set()
        worker.join(timeout=10)
    assert not worker.is_alive()
    job = client.get(f"/api/v1/analyses/{job_id}").json()
    assert job["status"] == "failed"
    assert next(stage for stage in job["stages"] if stage["key"] == "soil")["status"] == "skipped"
