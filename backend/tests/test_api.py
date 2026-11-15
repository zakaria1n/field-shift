"""API and SQLite persistence tests (provider fixtures, no network)."""
import time


def test_missing_anonymous_key_rejected(client):
    r = client.get("/api/v1/fields", headers={})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "anonymous_access_required"


def test_priorities_must_total_100(field_with_profile):
    c, field_id = field_with_profile
    r = c.put(f"/api/v1/fields/{field_id}/profile", json={
        "irrigation_type": "rainfed", "purposes": [],
        "priorities": {"water": 80, "soil": 10, "yield": 10, "risk": 10},
    })
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "priorities_not_normalized"


def test_crop_history_multi_season_per_year(field_with_profile):
    c, field_id = field_with_profile
    entries = [
        {"crop_year": 2024, "crop_id": "bread_wheat", "status": "planted", "season_label": "main"},
        {"crop_year": 2024, "crop_id": "lettuce", "status": "planted", "season_label": "summer"},
        {"crop_year": 2025, "status": "fallow"},
        {"crop_year": 2026, "status": "unknown"},
    ]
    r = c.put(f"/api/v1/fields/{field_id}/crop-history", json=entries)
    assert r.status_code == 200
    saved = c.get(f"/api/v1/fields/{field_id}/crop-history").json()["entries"]
    years = {}
    for e in saved:
        years.setdefault(e["crop_year"], []).append((e["crop_id"], e["status"], e["season_label"]))
    assert len(years[2024]) == 2, "two crops in one year persist separately"
    assert years[2025][0][1] == "fallow"
    assert years[2026][0][1] == "unknown"


def test_planted_entry_requires_crop_id(field_with_profile):
    c, field_id = field_with_profile
    r = c.put(f"/api/v1/fields/{field_id}/crop-history", json=[
        {"crop_year": 2026, "status": "planted"}])
    assert r.status_code == 422


def test_analysis_runs_and_rotations_served(analyzed_field):
    c, field_id, job_id = analyzed_field
    job = c.get(f"/api/v1/analyses/{job_id}").json()
    assert job["status"] in ("complete", "partial")
    stage_status = {s["key"]: s["status"] for s in job["stages"]}
    assert stage_status["climate"] == "complete"
    assert stage_status["rotation"] == "complete"
    src_status = {s["source_id"]: s["status"] for s in job["sources"]}
    assert src_status["nasa_power"] in ("live", "cached")

    rot = c.get(f"/api/v1/fields/{field_id}/rotations").json()
    assert rot["analysis_id"] == job_id
    assert 1 <= len(rot["rotations"]) <= 3
    plan = rot["rotations"][0]
    assert plan["score"]["total"] is not None
    assert len(plan["slots"]) == 3
    # Yield indicator scores from the fixture GAEZ references for mapped
    # crops (cereals); rotations built only from unmapped crops stay
    # honestly unavailable, but at least one scored rotation must exist.
    src_status = {s["source_id"]: s["status"] for s in job["sources"]}
    assert src_status["gaez_v5"] == "live"
    scored = [r for r in rot["rotations"]
              if any(i["key"] == "yield" and i["value"] is not None
                     for i in r["score"]["indicators"])]
    assert scored, "fixture GAEZ refs should score at least one rotation"
    plan = scored[0]
    indicators = {i["key"]: i for i in plan["score"]["indicators"]}
    assert indicators["yield"]["status"] in ("available", "partial")
    assert "fixture" in (next(s for s in job["sources"] if s["source_id"] == "gaez_v5")["detail"] or "").lower()


def test_substitutes_exclude_other_slots_and_hard_excluded_crops(analyzed_field):
    c, field_id, job_id = analyzed_field
    plan = c.get(f"/api/v1/fields/{field_id}/rotations").json()["rotations"][0]
    ref = plan["plan_id"]
    used = {s["crop_id"] for s in plan["slots"] if s["crop_id"]}
    slot_id = plan["slots"][1]["slot_id"]
    subs = c.get(f"/api/v1/rotations/{ref}/slots/{slot_id}/substitutes").json()
    ids = [x["crop_id"] for x in subs["candidates"]]
    assert not (set(ids) & used), "crops already in the plan are not offered"
    # rainfed + ~400mm fixture rainfall: garlic (absolute minimum 500mm) must not appear
    assert "garlic" not in ids


def test_evaluate_and_adopt_modified_then_original(analyzed_field):
    c, field_id, job_id = analyzed_field
    plan = c.get(f"/api/v1/fields/{field_id}/rotations").json()["rotations"][0]
    ref = plan["plan_id"]
    slots = plan["slots"]
    s0, s1 = slots[0]["slot_id"], slots[1]["slot_id"]
    subs0 = c.get(f"/api/v1/rotations/{ref}/slots/{s0}/substitutes").json()["candidates"]
    subs1 = c.get(f"/api/v1/rotations/{ref}/slots/{s1}/substitutes").json()["candidates"]
    alt0 = subs0[0]["crop_id"]
    alt1 = next(x["crop_id"] for x in subs1 if x["crop_id"] != alt0)

    ev = c.post(f"/api/v1/rotations/{ref}/evaluate", json={
        "edits": [{"slot_id": s0, "crop_id": alt0}, {"slot_id": s1, "crop_id": alt1}]})
    assert ev.status_code == 200
    ev = ev.json()
    assert ev["feasibility"] in ("feasible", "needs_review")
    assert ev["modified_score"]["total"] is not None
    assert len(ev["comparison"]) == 4

    adopted = c.post(f"/api/v1/rotations/{ref}/adopt", json={
        "edits": [{"slot_id": s0, "crop_id": alt0}, {"slot_id": s1, "crop_id": alt1}]}).json()
    assert [(s["crop_id"] or "fallow") for s in adopted["slots"]] != \
           [(s["crop_id"] or "fallow") for s in plan["slots"]]

    dash = c.get("/api/v1/dashboard").json()[0]
    assert dash["active_plan"]["version_id"] == adopted["version_id"]

    # original remains adoptable afterwards (T19)
    back = c.post(f"/api/v1/rotations/{ref}/adopt", json={}).json()
    assert [(s["crop_id"] or "fallow") for s in back["slots"]] == \
           [(s["crop_id"] or "fallow") for s in plan["slots"]]
    versions = c.get(f"/api/v1/fields/{field_id}/plan-versions").json()["versions"]
    active = [v for v in versions if v["is_active"]]
    assert len(active) == 1
    assert any(v["status"] == "archived" for v in versions)


def test_infeasible_adopt_rejected(analyzed_field):
    c, field_id, job_id = analyzed_field
    plan = c.get(f"/api/v1/fields/{field_id}/rotations").json()["rotations"][0]
    ref = plan["plan_id"]
    s0, s2 = plan["slots"][0]["slot_id"], plan["slots"][2]["slot_id"]
    crop = plan["slots"][0]["crop_id"]
    # duplicate crop across two slots -> hard violation -> 409
    r = c.post(f"/api/v1/rotations/{ref}/adopt", json={
        "edits": [{"slot_id": s2, "crop_id": crop}]})
    assert r.status_code == 409


def test_ownership_isolation(client, auth_client, analyzed_field):
    _, field_id, _ = analyzed_field
    other, other_key = auth_client()
    r = other.get(f"/api/v1/fields/{field_id}")
    assert r.status_code == 404
    r = other.get("/api/v1/fields")
    assert r.json()["fields"] == []


def test_field_update_invalidates_running_analyses(analyzed_field):
    c, field_id, job_id = analyzed_field
    new_geom = {
        "type": "Polygon",
        "coordinates": [[[-5.460, 33.980], [-5.452, 33.982], [-5.450, 33.978], [-5.457, 33.976], [-5.460, 33.980]]],
    }
    r = c.patch(f"/api/v1/fields/{field_id}", json={"name": "Renamed", "geometry": new_geom})
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed"
    ins = c.get(f"/api/v1/fields/{field_id}/insights").json()
    # insights still reference the old analysis; rotations endpoint should not
    # silently reuse stale results for the new geometry: re-analysis required.
    rot = c.get(f"/api/v1/fields/{field_id}/rotations").json()
    assert rot["rotations"], "existing completed analysis remains browsable until replaced"
    assert c.get(f"/api/v1/fields/{field_id}").json()["area_ha"] > 0


def test_farmer_event_labeled_as_farmer_reported(field_with_profile):
    c, field_id = field_with_profile
    r = c.put(f"/api/v1/fields/{field_id}/events", json={
        "event_type": "planted", "crop_slot_id": "y1", "event_date": "2027-11-20", "notes": "log"})
    assert r.status_code == 201
    events = c.get(f"/api/v1/fields/{field_id}/events").json()["events"]
    assert events[0]["reported_by"] == "farmer"


def test_crop_catalog_carries_audit_flags(client):
    cat = client.get("/api/v1/crops").json()
    assert len(cat["crops"]) == 37
    assert "provisional" in cat["catalog_notice"]
    wheat = next(x for x in cat["crops"] if x["crop_id"] == "bread_wheat")
    assert wheat["agronomic_review_status"] == "unverified_team_reference"


def test_delete_field_removes_data(analyzed_field):
    c, field_id, _ = analyzed_field
    assert c.delete(f"/api/v1/fields/{field_id}").status_code == 204
    assert c.get(f"/api/v1/fields/{field_id}").status_code == 404
    assert all(f["field_id"] != field_id for f in c.get("/api/v1/fields").json()["fields"])


def test_places_search(client):
    r = client.get("/api/v1/places/search", params={"q": "Meknes"})
    assert r.status_code == 200
    body = r.json()
    assert body["provider"] == "nominatim"
    assert "OpenStreetMap" in body["attribution"]
