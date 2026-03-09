import {
  access,
  mkdir,
  mkdtemp,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ScriptCommandNotFoundError,
  TerminalScripts,
  type RecordProcessRunner,
} from "../src/core/terminal-scripts.js";

class FakeRunner implements RecordProcessRunner {
  constructor(
    private readonly exitCode: number,
    private readonly shouldThrow = false,
  ) {}

  logPath: string | null = null;

  async run(logPath: string): Promise<number> {
    this.logPath = logPath;

    if (this.shouldThrow) {
      throw new ScriptCommandNotFoundError();
    }

    return this.exitCode;
  }
}

describe("TerminalScripts", () => {
  it("creates log directory and delegates recording to process runner", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "scriptz-"));
    const logsDirectory = join(tempRoot, "record-logs");

    try {
      const runner = new FakeRunner(7);
      const scripts = new TerminalScripts(logsDirectory, undefined, runner);

      const exitCode = await scripts.record();

      expect(exitCode).toBe(7);
      expect(runner.logPath).toMatch(
        new RegExp(
          `^${escapeForRegExp(logsDirectory)}/\\d{4}-\\d{2}-\\d{2}-\\d{2}-\\d{2}-\\d{2}\\.log$`,
        ),
      );

      const directoryStats = await stat(logsDirectory);
      expect(directoryStats.isDirectory()).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("removes only logs older than 15 minutes", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "scriptz-"));
    const logsDirectory = join(tempRoot, "clean-logs");
    await mkdir(logsDirectory, { recursive: true });

    const oldLog = join(logsDirectory, "old.log");
    const recentLog = join(logsDirectory, "recent.log");

    try {
      await writeFile(oldLog, "old", "utf8");
      await writeFile(recentLog, "recent", "utf8");

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      await utimes(oldLog, thirtyMinutesAgo, thirtyMinutesAgo);

      const scripts = new TerminalScripts(logsDirectory);
      const result = await scripts.clean(15);

      expect(result.directoryExists).toBe(true);
      expect(result.removed).toBe(1);

      await expect(access(oldLog)).rejects.toThrow();
      await expect(access(recentLog)).resolves.toBeUndefined();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("returns directory missing when logs directory does not exist", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "scriptz-"));
    const logsDirectory = join(tempRoot, "missing");

    try {
      const scripts = new TerminalScripts(logsDirectory);
      const result = await scripts.clean(15);

      expect(result.directoryExists).toBe(false);
      expect(result.removed).toBe(0);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
