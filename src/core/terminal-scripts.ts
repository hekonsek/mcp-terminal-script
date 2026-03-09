import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";

import {
  noopTerminalScriptsListener,
  type TerminalScriptsListener,
} from "./terminal-scripts-listener.js";

export interface RecordProcessRunner {
  run(logPath: string): Promise<number>;
}

export interface CleanResult {
  directoryExists: boolean;
  removed: number;
}

export class ScriptCommandNotFoundError extends Error {
  constructor() {
    super("The 'script' command is not available.");
    this.name = "ScriptCommandNotFoundError";
  }
}

export class ScriptProcessRunner implements RecordProcessRunner {
  async run(logPath: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const child = spawn("script", ["-q", "-f", logPath], {
        stdio: "inherit",
      });

      child.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") {
          reject(new ScriptCommandNotFoundError());
          return;
        }

        reject(error);
      });

      child.once("close", (code: number | null) => {
        resolve(code ?? 1);
      });
    });
  }
}

export class TerminalScripts {
  constructor(
    private readonly directory: string,
    private readonly listener: TerminalScriptsListener = noopTerminalScriptsListener,
    private readonly processRunner: RecordProcessRunner = new ScriptProcessRunner(),
  ) {}

  async record(): Promise<number> {
    await mkdir(this.directory, { recursive: true });

    const logPath = join(this.directory, `${buildTimestamp()}.log`);
    this.listener.onEvent({ type: "record_started", logPath });

    return this.processRunner.run(logPath);
  }

  async clean(maxAgeMinutes = 15): Promise<CleanResult> {
    try {
      const directoryStat = await stat(this.directory);
      if (!directoryStat.isDirectory()) {
        return { directoryExists: false, removed: 0 };
      }
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException;
      if (typedError.code === "ENOENT") {
        return { directoryExists: false, removed: 0 };
      }

      throw error;
    }

    const entries = await readdir(this.directory, { withFileTypes: true });
    const cutoff = Date.now() - maxAgeMinutes * 60 * 1000;
    let removed = 0;

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const filePath = join(this.directory, entry.name);
      let modifiedAtMs: number;

      try {
        const fileStat = await stat(filePath);
        modifiedAtMs = fileStat.mtimeMs;
      } catch (error) {
        const reason = toErrorMessage(error);
        this.listener.onEvent({
          type: "entry_skipped",
          entryName: entry.name,
          reason,
        });
        continue;
      }

      if (modifiedAtMs >= cutoff) {
        continue;
      }

      try {
        await unlink(filePath);
        removed += 1;
      } catch (error) {
        const typedError = error as NodeJS.ErrnoException;
        if (typedError.code === "ENOENT") {
          continue;
        }

        const reason = toErrorMessage(error);
        this.listener.onEvent({
          type: "entry_remove_failed",
          entryName: entry.name,
          reason,
        });
      }
    }

    return { directoryExists: true, removed };
  }
}

function buildTimestamp(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = twoDigits(now.getMonth() + 1);
  const day = twoDigits(now.getDate());
  const hours = twoDigits(now.getHours());
  const minutes = twoDigits(now.getMinutes());
  const seconds = twoDigits(now.getSeconds());

  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

function twoDigits(value: number): string {
  return value.toString().padStart(2, "0");
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
