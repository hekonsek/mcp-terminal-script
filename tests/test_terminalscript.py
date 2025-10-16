from pathlib import Path
from types import SimpleNamespace
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import mcp_terminal_script.terminalscript as terminalscript
from mcp_terminal_script.terminalscript import TerminalScripts


def test_record_creates_directory_and_invokes_script(tmp_path, monkeypatch):
    logs_dir = tmp_path / "logs"
    recorded = {}
    dummy_result = SimpleNamespace(returncode=0)

    def fake_run(args, check):
        recorded["args"] = args
        recorded["check"] = check
        return dummy_result

    monkeypatch.setattr(terminalscript.subprocess, "run", fake_run)

    scripts = TerminalScripts(logs_dir)
    result = scripts.record()

    assert logs_dir.exists()
    assert recorded["check"] is False
    assert recorded["args"][0] == "script"
    script_path = Path(recorded["args"][3])
    assert script_path.parent == logs_dir
    assert script_path.suffix == ".log"
    assert result is dummy_result

