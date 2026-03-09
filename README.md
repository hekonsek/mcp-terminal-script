# Terminal session script utilities

This project provides a small CLI for working with terminal session recordings created by the standard Unix `script` command.

## How it works

- Recordings are stored in `~/.cache/script`.
- `record` starts a new `script` session and writes output to a timestamped `.log` file.
- `clean` removes recordings older than 15 minutes so only recent session data stays on disk.

## Commands

- `mcp-terminal-script record` starts a new recording session.
- `mcp-terminal-script clean` removes recordings older than 15 minutes.
- `mcp-terminal-script version` prints the installed package version.

## Local development

Run the test suite with:

```bash
poetry run pytest
```
