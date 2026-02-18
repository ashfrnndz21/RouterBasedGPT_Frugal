import fs from 'fs';

export class SoulLoader {
  private content: string = '';
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? './soul/SOUL.md';
  }

  /** Load SOUL.md from disk synchronously. Sets content to empty string if file is unreadable. */
  load(): void {
    try {
      this.content = fs.readFileSync(this.filePath, 'utf8');
    } catch {
      this.content = '';
    }
  }

  /** Start polling for file changes every 60 seconds; reloads on change. */
  watch(): void {
    fs.watchFile(this.filePath, { interval: 60000 }, () => {
      this.load();
    });
  }

  /** Returns the current cached SOUL.md content. */
  getPersonality(): string {
    return this.content;
  }
}

let instance: SoulLoader | null = null;

/** Returns the singleton SoulLoader instance. */
export function getSoulLoader(): SoulLoader {
  if (!instance) {
    instance = new SoulLoader();
  }
  return instance;
}
