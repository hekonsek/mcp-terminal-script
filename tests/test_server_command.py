"""Tests for the `mcp-terminal-script server` command."""

import asyncio
from pathlib import Path

import pytest
from typer.testing import CliRunner

from mcp_terminal_script import cli


@pytest.fixture()
def server_command_setup(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Prepare environment and fakes for exercising the server command."""
    runner = CliRunner()
    instructions = "Test instructions"

    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setattr(cli, "_load_agent_instructions", lambda: instructions)

    class FakeFastMCP:
        instances: list["FakeFastMCP"] = []

        def __init__(self, **kwargs):
            self.kwargs = kwargs
            self.resources = []
            self.resource_templates = []
            self.run_called = False
            FakeFastMCP.instances.append(self)

        def add_resource(self, resource):
            self.resources.append(resource)
            return resource

        def resource(self, uri: str, **options):
            def decorator(fn):
                self.resource_templates.append({"uri": uri, "options": options, "fn": fn})
                return fn

            return decorator

        async def run_stdio_async(self):
            self.run_called = True

    FakeFastMCP.instances.clear()
    monkeypatch.setattr(cli, "FastMCP", FakeFastMCP)

    def fake_run(async_fn, *args, **kwargs):
        fake_run.called = True
        return asyncio.run(async_fn(*args, **kwargs))

    fake_run.called = False
    monkeypatch.setattr(cli.anyio, "run", fake_run)

    return runner, instructions, FakeFastMCP, fake_run, tmp_path


def test_server_registers_resources_and_runs(server_command_setup):
    runner, instructions, FakeFastMCP, fake_run, tmp_path = server_command_setup

    log_dir = tmp_path / ".cache" / "script"
    log_dir.mkdir(parents=True, exist_ok=True)
    (log_dir / "demo.log").write_text("demo\n", encoding="utf-8")

    result = runner.invoke(cli.app, ["server"])
    assert result.exit_code == 0, result.output
    assert fake_run.called
    assert FakeFastMCP.instances, "FastMCP server was not constructed"

    server_instance = FakeFastMCP.instances[0]
    assert server_instance.kwargs["name"] == cli.__app_name__
    assert server_instance.kwargs["instructions"] == instructions
    assert server_instance.run_called

    resource_uris = {str(resource.uri) for resource in server_instance.resources}
    assert "resource://terminal-script/instructions" in resource_uris
    assert "resource://terminal-script/logs" in resource_uris

    text_resource = next(
        resource for resource in server_instance.resources if str(resource.uri) == "resource://terminal-script/instructions"
    )
    assert text_resource.text == instructions

    directory_resource = next(
        resource for resource in server_instance.resources if str(resource.uri) == "resource://terminal-script/logs"
    )
    assert directory_resource.path == log_dir

    read_template = server_instance.resource_templates[0]
    assert read_template["uri"] == "resource://terminal-script/log/{log_name}"
    read_log = read_template["fn"]
    assert read_log("demo.log") == "demo\n"


def test_server_resource_validates_log_names(server_command_setup):
    runner, _, FakeFastMCP, _, _ = server_command_setup

    result = runner.invoke(cli.app, ["server"])
    assert result.exit_code == 0, result.output

    server_instance = FakeFastMCP.instances[0]
    read_log = server_instance.resource_templates[0]["fn"]

    with pytest.raises(cli.ResourceError):
        read_log("../secret.log")

    with pytest.raises(cli.ResourceError):
        read_log("missing.log")
