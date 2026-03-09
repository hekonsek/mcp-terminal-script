import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createCli, type CliDependencies } from "../src/cli/cli.js";

describe("CLI", () => {
  it("prints version from dependency", async () => {
    const out: string[] = [];
    const err: string[] = [];
    const exitCodes: number[] = [];
    const deps: CliDependencies = {
      homeDirectory: "/tmp",
      writeOut: (line: string) => out.push(line),
      writeErr: (line: string) => err.push(line),
      setExitCode: (code: number) => exitCodes.push(code),
      readVersion: async () => "1.2.3",
    };

    const cli = createCli(deps);
    await cli.parseAsync(["node", "scriptz", "version"]);

    expect(out).toEqual(["1.2.3"]);
    expect(err).toEqual([]);
    expect(exitCodes).toEqual([]);
  });

  it("removes old logs and reports summary", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "scriptz-"));
    const logsDir = join(tempRoot, ".cache", "script");
    await mkdir(logsDir, { recursive: true });

    const out: string[] = [];
    const err: string[] = [];
    const exitCodes: number[] = [];

    const oldLog = join(logsDir, "old.log");
    const recentLog = join(logsDir, "recent.log");

    try {
      await writeFile(oldLog, "old", "utf8");
      await writeFile(recentLog, "recent", "utf8");

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      await utimes(oldLog, thirtyMinutesAgo, thirtyMinutesAgo);

      const deps: CliDependencies = {
        homeDirectory: tempRoot,
        writeOut: (line: string) => out.push(line),
        writeErr: (line: string) => err.push(line),
        setExitCode: (code: number) => exitCodes.push(code),
        readVersion: async () => "0.1.0",
      };

      const cli = createCli(deps);
      await cli.parseAsync(["node", "scriptz", "clean"]);

      expect(out).toEqual(["Removed 1 log older than 15 minutes."]);
      expect(err).toEqual([]);
      expect(exitCodes).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("reports missing logs directory in non-quiet mode", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "scriptz-"));
    const out: string[] = [];
    const err: string[] = [];

    try {
      const deps: CliDependencies = {
        homeDirectory: tempRoot,
        writeOut: (line: string) => out.push(line),
        writeErr: (line: string) => err.push(line),
        setExitCode: () => undefined,
        readVersion: async () => "0.1.0",
      };

      const cli = createCli(deps);
      await cli.parseAsync(["node", "scriptz", "clean"]);

      expect(out).toEqual(["No script logs directory found."]);
      expect(err).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
