"""Utilities for working with terminal script recordings."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
import subprocess


class TerminalScripts:
    """Manage recording of terminal sessions using the script command."""

    def __init__(self, directory: Path) -> None:
        self._directory = directory

    @property
    def directory(self) -> Path:
        """Directory where script logs are stored."""
        return self._directory

    def record(self) -> subprocess.CompletedProcess:
        """Start a new recording session and return the completed process."""
        self._directory.mkdir(parents=True, exist_ok=True)

        start_timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
        script_path = self._directory / f"{start_timestamp}.log"

        return subprocess.run(["script", "-q", "-f", str(script_path)], check=False)
