#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import chalk from "chalk";
import { Command } from "commander";

import {
  ScriptCommandNotFoundError,
  TerminalScripts,
} from "../core/terminal-scripts.js";
import type {
  TerminalScriptsEvent,
  TerminalScriptsListener,
} from "../core/terminal-scripts-listener.js";

export interface CliDependencies {
  readonly homeDirectory: string;
  readonly writeOut: (line: string) => void;
  readonly writeErr: (line: string) => void;
  readonly setExitCode: (code: number) => void;
  readVersion: () => Promise<string>;
}

const defaultDependencies: CliDependencies = {
  homeDirectory: homedir(),
  writeOut: (line: string): void => {
    process.stdout.write(`${line}\n`);
  },
  writeErr: (line: string): void => {
    process.stderr.write(`${line}\n`);
  },
  setExitCode: (code: number): void => {
    process.exitCode = code;
  },
  readVersion,
};

export function createCli(deps: CliDependencies = defaultDependencies): Command {
  const program = new Command();

  program
    .name("scriptz")
    .description("Record terminal sessions and clean up old script logs.")
    .showHelpAfterError();

  program
    .command("version")
    .description("Display the installed package version.")
    .action(async () => {
      deps.writeOut(await deps.readVersion());
    });

  program
    .command("record")
    .description("Start a script(1) recording session.")
    .action(async () => {
      const scripts = new TerminalScripts(
        join(deps.homeDirectory, ".cache", "script"),
      );

      try {
        deps.setExitCode(await scripts.record());
      } catch (error) {
        if (error instanceof ScriptCommandNotFoundError) {
          deps.writeErr(
            chalk.red(
              "The 'script' command is not available. Install util-linux to enable recording.",
            ),
          );
          deps.setExitCode(127);
          return;
        }

        throw error;
      }
    });

  program
    .command("clean")
    .description("Remove script logs that haven't been touched in the last 15 minutes.")
    .option("-q, --quiet", "Suppress command output.", false)
    .action(async (options: { quiet: boolean }) => {
      const listener = buildCleanListener(options.quiet, deps);
      const scripts = new TerminalScripts(
        join(deps.homeDirectory, ".cache", "script"),
        listener,
      );

      const result = await scripts.clean(15);
      if (options.quiet) {
        return;
      }

      if (!result.directoryExists) {
        deps.writeOut("No script logs directory found.");
        return;
      }

      if (result.removed > 0) {
        deps.writeOut(
          `Removed ${result.removed} log${result.removed === 1 ? "" : "s"} older than 15 minutes.`,
        );
        return;
      }

      deps.writeOut("No logs older than 15 minutes were found.");
    });

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = createCli();
  if (argv.length <= 2) {
    program.outputHelp();
    return;
  }

  await program.parseAsync(argv);
}

async function readVersion(): Promise<string> {
  const packageJsonPath = new URL("../../package.json", import.meta.url);
  const packageJsonRaw = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonRaw) as { version?: string };

  return packageJson.version ?? "0.0.0";
}

function buildCleanListener(
  quiet: boolean,
  deps: CliDependencies,
): TerminalScriptsListener {
  if (quiet) {
    return { onEvent: () => undefined };
  }

  return {
    onEvent(event: TerminalScriptsEvent): void {
      if (event.type === "entry_skipped") {
        deps.writeErr(
          chalk.yellow(`Skipping ${event.entryName}: ${event.reason}`),
        );
      }

      if (event.type === "entry_remove_failed") {
        deps.writeErr(
          chalk.red(`Failed to remove ${event.entryName}: ${event.reason}`),
        );
      }
    },
  };
}

if (import.meta.main) {
  await runCli();
}
