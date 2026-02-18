import fs from 'fs';
import path from 'path';

export type TranscriptEventType =
  | 'user_message'
  | 'assistant_response'
  | 'routing_decision'
  | 'compaction'
  | 'cache_hit'
  | 'error';

export interface TranscriptEvent {
  sessionId: string;
  eventType: TranscriptEventType;
  timestamp: number;
  payload: Record<string, unknown>;
}

export class TranscriptWriter {
  private dir: string;

  constructor(dir?: string) {
    this.dir = dir ?? './transcripts';
  }

  /** Return the JSONL file path for a given session */
  pathFor(sessionId: string): string {
    return path.join(this.dir, `${sessionId}.jsonl`);
  }

  /**
   * Serialize the event to JSON and append a newline-terminated line.
   * Retries up to 3 times on failure (synchronous retry loop).
   * Logs a critical error and continues if all retries fail.
   */
  async append(event: TranscriptEvent): Promise<void> {
    const line = JSON.stringify(event) + '\n';
    const filePath = this.pathFor(event.sessionId);

    const MAX_RETRIES = 3;
    const DELAY_MS = 50;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        fs.appendFileSync(filePath, line, 'utf8');
        return;
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          await new Promise<void>(resolve => setTimeout(resolve, DELAY_MS));
        } else {
          console.error(
            `[TranscriptWriter] CRITICAL: failed to append event after ${MAX_RETRIES} attempts for session ${event.sessionId}`,
            err
          );
        }
      }
    }
  }
}

let instance: TranscriptWriter | null = null;

/** Returns the singleton TranscriptWriter instance. */
export function getTranscriptWriter(): TranscriptWriter {
  if (!instance) {
    instance = new TranscriptWriter();
  }
  return instance;
}
