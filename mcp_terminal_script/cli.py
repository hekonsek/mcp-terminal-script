"""Command line interface for the mcp-terminal-script package."""

from datetime import datetime, timedelta
from pathlib import Path

import typer

from . import __version__
from .terminalscript import TerminalScripts

app = typer.Typer(
    help="Record terminal sessions and clean up old script logs.",
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


def main() -> None:
    """Entry point for the console script."""
    app()


if __name__ == "__main__":  # pragma: no cover - module CLI execution
    main()
