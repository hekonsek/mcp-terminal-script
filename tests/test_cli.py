from datetime import datetime, timedelta
import os
from pathlib import Path
from types import SimpleNamespace
import sys

from typer.testing import CliRunner

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import mcp_terminal_script.cli as cli


runner = CliRunner()


def test_record_command_delegates_to_terminal_scripts(monkeypatch, tmp_path):
    captured = {}

    class FakeTerminalScripts:
        def __init__(self, directory: Path) -> None:
            captured["directory"] = directory

        def record(self):
            return SimpleNamespace(returncode=7)

    monkeypatch.setattr(cli, "TerminalScripts", FakeTerminalScripts)
    monkeypatch.setattr(cli.Path, "home", lambda: tmp_path)

    result = runner.invoke(cli.app, ["record"])

    assert result.exit_code == 7
    assert captured["directory"] == tmp_path / ".cache" / "script"


def test_clean_command_removes_only_old_logs(monkeypatch, tmp_path):
    logs_dir = tmp_path / ".cache" / "script"
    logs_dir.mkdir(parents=True)

    old_log = logs_dir / "old.log"
    old_log.write_text("old", encoding="utf-8")
    old_mtime = (datetime.now() - timedelta(minutes=30)).timestamp()
    os.utime(old_log, (old_mtime, old_mtime))

    recent_log = logs_dir / "recent.log"
    recent_log.write_text("recent", encoding="utf-8")

    monkeypatch.setattr(cli.Path, "home", lambda: tmp_path)

    result = runner.invoke(cli.app, ["clean"])

    assert result.exit_code == 0
    assert "Removed 1 log older than 15 minutes." in result.stdout
    assert not old_log.exists()
    assert recent_log.exists()


def test_server_command_is_not_available():
    result = runner.invoke(cli.app, ["server"])

    assert result.exit_code == 2
    assert "No such command 'server'" in result.output
