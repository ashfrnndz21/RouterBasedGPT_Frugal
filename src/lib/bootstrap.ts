import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { getContextStore } from './context/contextStore';
import { getSoulLoader } from './soul/soulLoader';

// ---------------------------------------------------------------------------
// Default content constants (Requirements 10.1)
// ---------------------------------------------------------------------------

export const DEFAULT_SOUL =
  'You are FrugalAI, a cost-conscious AI assistant. You are direct, precise, and always cite your sources.\n' +
  'You prefer concise answers and escalate to deeper reasoning only when the question genuinely requires it.';

export const DEFAULT_EXAMPLES = [
  { text: 'What is the capital of France?', tier: 'nano' },
  { text: 'Explain the implications of quantum entanglement for cryptography', tier: 'full' },
  { text: 'Summarize the latest news about electric vehicles', tier: 'micro' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a directory if it does not already exist (idempotent).
 * Uses fs.mkdirSync with { recursive: true } so nested paths are safe.
 */
export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Creates a file with the given default content if it does not already exist
 * (idempotent — never overwrites an existing file).
 */
export function ensureFile(filePath: string, defaultContent: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent, 'utf8');
  }
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

function sanitizeSql(content: string): string {
  return content
    .split(/\r?\n/)
    .filter(
      (l: string) => !l.trim().startsWith('-->') && !l.includes('statement-breakpoint'),
    )
    .join('\n');
}

/**
 * Runs pending SQL migrations from the drizzle/ folder against db.sqlite.
 * Mirrors the logic in src/lib/db/migrate.ts so it is safe to call at startup.
 */
export async function runMigrations(): Promise<void> {
  const DATA_DIR = process.env.DATA_DIR || process.cwd();
  const dbPath = path.join(DATA_DIR, 'data', 'db.sqlite');
  const migrationsFolder = path.join(DATA_DIR, 'drizzle');

  // Ensure the data directory exists before opening the DB
  ensureDir(path.dirname(dbPath));

  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ran_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      run_on DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  if (!fs.existsSync(migrationsFolder)) {
    console.log('[bootstrap] No migrations folder found, skipping migrations.');
    db.close();
    return;
  }

  const files = fs
    .readdirSync(migrationsFolder)
    .filter((f: string) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    // Use the full filename as the migration key to avoid collisions
    // (e.g. 0002_add_sessions_semantic_cache.sql vs 0002_workspace_tables.sql)
    const migrationName = file;

    const already = db
      .prepare('SELECT 1 FROM ran_migrations WHERE name = ?')
      .get(migrationName);

    if (already) {
      console.log(`[bootstrap] Skipping already-applied migration: ${file}`);
      continue;
    }

    const filePath = path.join(migrationsFolder, file);
    const content = sanitizeSql(fs.readFileSync(filePath, 'utf-8'));

    try {
      db.exec(content);
      db.prepare('INSERT OR IGNORE INTO ran_migrations (name) VALUES (?)').run(migrationName);
      console.log(`[bootstrap] Applied migration: ${file}`);
    } catch (err) {
      console.error(`[bootstrap] Failed to apply migration ${file}:`, err);
      db.close();
      throw err;
    }
  }

  db.close();
}



// ---------------------------------------------------------------------------
// Bootstrap entry point
// ---------------------------------------------------------------------------

/**
 * Runs all startup tasks:
 *  1. Ensures required directories exist
 *  2. Ensures default config files exist
 *  3. Runs pending DB migrations
 *  4. Warms in-memory caches from SQLite
 *  5. Loads and watches SOUL.md
 *
 * @param rootDir  Optional override for the project root (defaults to process.cwd()).
 *                 Useful in tests to point at a temp directory.
 */
export async function bootstrap(rootDir?: string): Promise<void> {
  const root = rootDir ?? process.cwd();

  // 1. Ensure directories
  ensureDir(path.join(root, 'soul'));
  ensureDir(path.join(root, 'memory'));
  ensureDir(path.join(root, 'transcripts'));
  ensureDir(path.join(root, 'config'));

  // 2. Ensure default files
  ensureFile(path.join(root, 'soul', 'SOUL.md'), DEFAULT_SOUL);
  ensureFile(
    path.join(root, 'config', 'router-examples.json'),
    JSON.stringify(DEFAULT_EXAMPLES, null, 2),
  );

  // 3. Run DB migrations
  await runMigrations();

  // 4. Warm ContextStore from SQLite
  try {
    await getContextStore().warmFromDb();
  } catch (err) {
    console.error('[bootstrap] getContextStore().warmFromDb() failed:', err);
  }

  // 5. Load SemanticCache from SQLite
  // Note: SemanticCache requires embeddings on first initialization.
  // loadFromDb() is called here only if the singleton was already initialized
  // (e.g., by a prior request). On a cold start it will be called by the
  // StatefulOrchestrator constructor after embeddings are available.
  try {
    const { getSemanticCache: _getCache } = await import('./cache/semanticCache');
    const cache = _getCache();
    cache.loadFromDb();
  } catch {
    // Singleton not yet initialized (no embeddings provided) — skip silently.
    // loadFromDb() will be called by the orchestrator after first initialization.
    console.log('[bootstrap] SemanticCache not yet initialized — loadFromDb() deferred.');
  }

  // 6. Load and watch SOUL.md
  try {
    getSoulLoader().load();
    getSoulLoader().watch();
  } catch (err) {
    console.error('[bootstrap] SoulLoader load/watch failed:', err);
  }

  console.log('[bootstrap] Bootstrap complete.');
}
