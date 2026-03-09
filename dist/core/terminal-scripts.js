import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { noopTerminalScriptsListener, } from "./terminal-scripts-listener.js";
export class ScriptCommandNotFoundError extends Error {
    constructor() {
        super("The 'script' command is not available.");
        this.name = "ScriptCommandNotFoundError";
    }
}
export class ScriptProcessRunner {
    async run(logPath) {
        return new Promise((resolve, reject) => {
            const child = spawn("script", ["-q", "-f", logPath], {
                stdio: "inherit",
            });
            child.once("error", (error) => {
                if (error.code === "ENOENT") {
                    reject(new ScriptCommandNotFoundError());
                    return;
                }
                reject(error);
            });
            child.once("close", (code) => {
                resolve(code ?? 1);
            });
        });
    }
}
export class TerminalScripts {
    directory;
    listener;
    processRunner;
    constructor(directory, listener = noopTerminalScriptsListener, processRunner = new ScriptProcessRunner()) {
        this.directory = directory;
        this.listener = listener;
        this.processRunner = processRunner;
    }
    async record() {
        await mkdir(this.directory, { recursive: true });
        const logPath = join(this.directory, `${buildTimestamp()}.log`);
        this.listener.onEvent({ type: "record_started", logPath });
        return this.processRunner.run(logPath);
    }
    async clean(maxAgeMinutes = 15) {
        try {
            const directoryStat = await stat(this.directory);
            if (!directoryStat.isDirectory()) {
                return { directoryExists: false, removed: 0 };
            }
        }
        catch (error) {
            const typedError = error;
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
            let modifiedAtMs;
            try {
                const fileStat = await stat(filePath);
                modifiedAtMs = fileStat.mtimeMs;
            }
            catch (error) {
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
            }
            catch (error) {
                const typedError = error;
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
function buildTimestamp(now = new Date()) {
    const year = now.getFullYear();
    const month = twoDigits(now.getMonth() + 1);
    const day = twoDigits(now.getDate());
    const hours = twoDigits(now.getHours());
    const minutes = twoDigits(now.getMinutes());
    const seconds = twoDigits(now.getSeconds());
    return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}
function twoDigits(value) {
    return value.toString().padStart(2, "0");
}
function toErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
//# sourceMappingURL=terminal-scripts.js.map