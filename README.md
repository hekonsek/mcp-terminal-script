# MCP for terminal session scripts

This package bundles a small MCP server that exposes terminal session scripts captured with the classic `script(1)` tool. The CLI provides a few handy commands:

- `mcp-terminal-script record` starts a new `script` recording and stores it under `~/.cache/script`.
- `mcp-terminal-script clean` removes recordings older than 15 minutes.
- `mcp-terminal-script server` launches an stdio-based MCP server (using the official Python SDK) so desktop clients such as Claude can inspect the cached recordings.
