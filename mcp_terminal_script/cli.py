"""Command line interface for the mcp-terminal-script package."""

from datetime import datetime
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


def main() -> None:
    """Entry point for the console script."""
    app()


if __name__ == "__main__":  # pragma: no cover - module CLI execution
    main()
