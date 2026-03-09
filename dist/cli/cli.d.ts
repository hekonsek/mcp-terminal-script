#!/usr/bin/env node
import { Command } from "commander";
export interface CliDependencies {
    readonly homeDirectory: string;
    readonly writeOut: (line: string) => void;
    readonly writeErr: (line: string) => void;
    readonly setExitCode: (code: number) => void;
    readVersion: () => Promise<string>;
}
export declare function createCli(deps?: CliDependencies): Command;
export declare function runCli(argv?: string[]): Promise<void>;
