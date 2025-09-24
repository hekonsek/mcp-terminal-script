"""mcp-terminal-script package."""

from importlib import metadata

__app_name__ = "mcp-terminal-script"

try:
    __version__ = metadata.version(__app_name__)
except metadata.PackageNotFoundError:  # pragma: no cover - best effort during dev
    __version__ = "0.0.0"

__all__ = ["__app_name__", "__version__"]
