"""Command line interface for the mcp-terminal-script package."""

from datetime import datetime, timedelta
from pathlib import Path

import anyio
import typer
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.exceptions import ResourceError
from mcp.server.fastmcp.resources import DirectoryResource, TextResource

from . import __app_name__, __version__
from .terminalscript import TerminalScripts

app = typer.Typer(
    help="Interact with the MCP terminal script tooling.",
    no_args_is_help=True,
    )


@app.command()
def version() -> None:
    """Display the installed package version."""
    typer.echo(__version__)


@app.command()
def record() -> None:
    """Start a script(1) recording session."""
    cache_dir = Path.home() / ".cache" / "script"
    scripts = TerminalScripts(cache_dir)

    try:
        result = scripts.record()
    except FileNotFoundError:  # script(1) is not available
        typer.secho("The 'script' command is not available. Install util-linux to enable recording.", fg="red", err=True)
        raise typer.Exit(code=127)

    raise typer.Exit(code=result.returncode)


@app.command()
def clean(
    quiet: bool = typer.Option(False, "--quiet", "-q", help="Suppress command output."),
) -> None:
    """Remove script logs that haven't been touched in the last 15 minutes."""
    cache_dir = Path.home() / ".cache" / "script"
    if not cache_dir.exists():
        if not quiet:
            typer.echo("No script logs directory found.")
        return

    cutoff = datetime.now() - timedelta(minutes=15)
    removed = 0

    for entry in cache_dir.iterdir():
        if not entry.is_file():
            continue

        try:
            last_modified = datetime.fromtimestamp(entry.stat().st_mtime)
        except OSError as exc:
            if not quiet:
                typer.secho(f"Skipping {entry.name}: {exc}", fg="yellow", err=True)
            continue

        if last_modified >= cutoff:
            continue

        try:
            entry.unlink()
            removed += 1
        except FileNotFoundError:
            continue
        except OSError as exc:
            if not quiet:
                typer.secho(f"Failed to remove {entry.name}: {exc}", fg="red", err=True)

    if quiet:
        return

    if removed:
        typer.echo(f"Removed {removed} log{'s' if removed != 1 else ''} older than 15 minutes.")
    else:
        typer.echo("No logs older than 15 minutes were found.")


def _load_agent_instructions() -> str:
    """Load agent instructions bundled with the package."""
    docs_path = Path(__file__).resolve().parent.parent / "docs" / "agents.md"
    try:
        return docs_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return (
            "Terminal session script instructions are unavailable because docs/agents.md could not be found. "
            "Ensure the documentation file is included with the package installation."
        )


@app.command()
def server() -> None:
    """Start an stdio-based MCP server that exposes terminal script logs."""
    cache_dir = Path.home() / ".cache" / "script"
    cache_dir.mkdir(parents=True, exist_ok=True)

    instructions = _load_agent_instructions()
    server_app = FastMCP(
        name=__app_name__,
        instructions=instructions,
    )

    server_app.add_resource(
        TextResource(
            uri="resource://terminal-script/instructions",
            name="terminal-script-instructions",
            title="Terminal Script Instructions",
            description="Guidelines for working with terminal session script logs.",
            mime_type="text/markdown",
            text=instructions,
        )
    )

    server_app.add_resource(
        DirectoryResource(
            uri="resource://terminal-script/logs",
            name="terminal-script-log-directory",
            title="Terminal Script Logs",
            description="List of script(1) session logs captured on this system.",
            path=cache_dir,
            pattern="*.log",
        )
    )

    @server_app.resource(
        "resource://terminal-script/log/{log_name}",
        title="Script Session Log",
        description="Read the raw output of a script(1) recording session.",
        mime_type="text/plain",
    )
    def read_log(log_name: str) -> str:
        safe_name = Path(log_name).name
        if safe_name != log_name:
            raise ResourceError("Log name must be a filename without directory separators.")

        log_path = cache_dir / safe_name
        if not log_path.is_file():
            raise ResourceError(f"No script log named '{log_name}' exists in {cache_dir}.")

        return log_path.read_text(encoding="utf-8", errors="replace")

    try:
        anyio.run(server_app.run_stdio_async)
    except KeyboardInterrupt:  # pragma: no cover - interactive command
        raise typer.Exit(code=130)


def main() -> None:
    """Entry point for the console script."""
    app()


if __name__ == "__main__":  # pragma: no cover - module CLI execution
    main()
