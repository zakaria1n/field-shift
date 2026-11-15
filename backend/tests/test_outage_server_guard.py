"""The failure harness must never start against a normal farmer database."""
from pathlib import Path
import runpy
import pytest

SCRIPT = Path(__file__).with_name('run_outage_server.py')

def test_outage_harness_requires_explicit_opt_in(monkeypatch):
    monkeypatch.delenv('FIELDSHIFT_TEST_OUTAGE', raising=False)
    with pytest.raises(RuntimeError, match='test-only'):
        runpy.run_path(str(SCRIPT))

def test_outage_harness_rejects_normal_database(monkeypatch):
    monkeypatch.setenv('FIELDSHIFT_TEST_OUTAGE', '1')
    monkeypatch.setenv('DATABASE_URL', 'sqlite:///' + str(SCRIPT.parents[1]/'fieldshift.db'))
    with pytest.raises(RuntimeError, match='separate'):
        runpy.run_path(str(SCRIPT))
