# MCP for terminal session scripts

This is MCP server and toolkit that allows coding agents to access your CLI terminal data (including stdin, stdout and stderr). It is useful in making agents aware of commands you are executing and their results.

## How to works

- Under the hood this tool uses standard Unix `script` command to capture your terminal sessions data. 
- Your terminal session are stored in `~/.cache/script` directory. 
- Old scripts are removed to keep only recent terminal session data.

## Commands

- `mcp-terminal-script record` starts a new `script` recording and stores it under `~/.cache/script`.
- `mcp-terminal-script clean` removes recordings older than 15 minutes.
- `mcp-terminal-script server` launches an stdio-based MCP server (using the official Python SDK) so desktop clients such as Claude can inspect the cached recordings.

## Local development

In order to run MCP server in Inspector, execute the following command in project directory:

```bash
npx @modelcontextprotocol/inspector poetry run mcp-terminal-script server
```