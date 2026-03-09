# Scriptz: record your terminal sessions with script

This project provides a Node.js + TypeScript CLI for working with terminal session recordings created by the Unix `script` command.

## How it works

- Recordings are stored in `~/.cache/script`.
- `record` starts a new `script` session and writes output to a timestamped `.log` file.
- `clean` removes recordings older than 15 minutes so only recent session data stays on disk.

## Commands

- `scriptz version` prints the package version.
- `scriptz record` starts a new recording session.
- `scriptz clean` removes recordings older than 15 minutes.
- `scriptz clean --quiet` removes old recordings without output.

## Local development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Run the CLI during development:

```bash
npm run dev -- version
```

Build distributable files:

```bash
npm run build
```
