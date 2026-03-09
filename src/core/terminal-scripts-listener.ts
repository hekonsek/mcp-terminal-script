export type TerminalScriptsEvent =
  | { type: "record_started"; logPath: string }
  | { type: "entry_skipped"; entryName: string; reason: string }
  | { type: "entry_remove_failed"; entryName: string; reason: string };

export interface TerminalScriptsListener {
  onEvent(event: TerminalScriptsEvent): void;
}

export const noopTerminalScriptsListener: TerminalScriptsListener = {
  onEvent(): void {
    // intentionally empty
  },
};
