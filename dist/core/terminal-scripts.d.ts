import { type TerminalScriptsListener } from "./terminal-scripts-listener.js";
export interface RecordProcessRunner {
    run(logPath: string): Promise<number>;
}
export interface CleanResult {
    directoryExists: boolean;
    removed: number;
}
export declare class ScriptCommandNotFoundError extends Error {
    constructor();
}
export declare class ScriptProcessRunner implements RecordProcessRunner {
    run(logPath: string): Promise<number>;
}
export declare class TerminalScripts {
    private readonly directory;
    private readonly listener;
    private readonly processRunner;
    constructor(directory: string, listener?: TerminalScriptsListener, processRunner?: RecordProcessRunner);
    record(): Promise<number>;
    clean(maxAgeMinutes?: number): Promise<CleanResult>;
}
