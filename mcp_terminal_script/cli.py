"""Command line interface for the mcp-terminal-script package."""

from datetime import datetime, timedelta
from pathlib import Path
import subprocess

import typer

from . import __version__

app = typer.Typer(add_completion=False, help="Interact with the MCP terminal script tooling.")


@app.command()
def greet(name: str = typer.Argument("world", help="Name to greet.")) -> None:
    """Print a friendly greeting."""
    typer.echo(f"Hello, {name}!")


@app.command()
def version() -> None:
    """Display the installed package version."""
    typer.echo(__version__)


@app.command()
def record() -> None:
    """Start a script(1) recording session."""
    cache_dir = Path.home() / ".cache" / "script"
    cache_dir.mkdir(parents=True, exist_ok=True)

    start_timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    script_path = cache_dir / f"{start_timestamp}.log"

    try:
        result = subprocess.run(["script", "-q", str(script_path)], check=False)
    except FileNotFoundError:  # script(1) is not available
        typer.secho("The 'script' command is not available. Install util-linux to enable recording.", fg="red", err=True)
        raise typer.Exit(code=127)

    raise typer.Exit(code=result.returncode)


@app.command()
def clean() -> None:
    """Remove script logs that haven't been touched in the last 15 minutes."""
    cache_dir = Path.home() / ".cache" / "script"
    if not cache_dir.exists():
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
            typer.secho(f"Failed to remove {entry.name}: {exc}", fg="red", err=True)

    if removed:
        typer.echo(f"Removed {removed} log{'s' if removed != 1 else ''} older than 15 minutes.")
    else:
        typer.echo("No logs older than 15 minutes were found.")


def main() -> None:
    """Entry point for the console script."""
    app()


if __name__ == "__main__":  # pragma: no cover - module CLI execution
    main()
