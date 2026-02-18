import fs from 'fs';

export class MemoryWriter {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? './memory/MEMORY.md';
  }

  /**
   * Appends a dated Markdown summary block to MEMORY.md.
   * Creates the file if it does not exist (appendFileSync handles this automatically).
   *
   * Format:
   * ## [2025-01-15T10:30:00Z] Session abc123
   *
   * <summary text>
   *
   * ---
   */
  appendSummary(sessionId: string, summary: string, timestamp: number): void {
    const isoTimestamp = new Date(timestamp).toISOString();
    const block = `## [${isoTimestamp}] Session ${sessionId}\n\n${summary}\n\n---\n`;
    fs.appendFileSync(this.filePath, block, 'utf8');
  }

  /**
   * Returns the full content of MEMORY.md as a string.
   * Returns an empty string if the file does not exist.
   */
  readAll(): string {
    try {
      return fs.readFileSync(this.filePath, 'utf8');
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ENOENT') {
        return '';
      }
      throw err;
    }
  }
}

let instance: MemoryWriter | null = null;

/** Returns the singleton MemoryWriter instance. */
export function getMemoryWriter(): MemoryWriter {
  if (!instance) {
    instance = new MemoryWriter();
  }
  return instance;
}
