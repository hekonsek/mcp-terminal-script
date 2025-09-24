"""Command line interface for the mcp-terminal-script package."""

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


def main() -> None:
    """Entry point for the console script."""
    app()


if __name__ == "__main__":  # pragma: no cover - module CLI execution
    main()
