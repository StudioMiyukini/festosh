import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, resolve, join } from 'path';
import * as schema from './schema';

const DB_PATH = resolve(process.cwd(), 'data', 'festosh.db');

// Ensure the data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Create the SQLite connection with security and performance pragmas
const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');       // Better concurrency
sqlite.pragma('foreign_keys = ON');        // Referential integrity
sqlite.pragma('busy_timeout = 5000');      // Wait on locked DB
sqlite.pragma('secure_delete = ON');       // Zero-fill deleted data (prevents recovery)
sqlite.pragma('auto_vacuum = INCREMENTAL');// Reclaim space from deleted records

// Create the Drizzle ORM instance with full schema for relational queries
export const db = drizzle(sqlite, { schema });

/**
 * Run pending migrations from the Drizzle journal.
 * Uses sqlite.exec() which natively handles multi-statement SQL.
 */
export function initializeDatabase(): void {
  const migrationsFolder = resolve(import.meta.dirname ?? __dirname, 'migrations');
  console.log(`[db] Running migrations from ${migrationsFolder}`);

  sqlite.exec(`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
    id integer PRIMARY KEY AUTOINCREMENT,
    hash text NOT NULL,
    created_at numeric
  )`);

  const journalPath = join(migrationsFolder, 'meta', '_journal.json');
  if (!existsSync(journalPath)) {
    console.log('[db] No migration journal found, skipping');
    return;
  }

  const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
  const entries: { idx: number; tag: string; when: number }[] = journal.entries;

  const applied = new Set(
    sqlite.prepare('SELECT hash FROM "__drizzle_migrations"').all()
      .map((row: any) => row.hash)
  );

  for (const entry of entries) {
    if (applied.has(entry.tag)) continue;

    const sqlFile = join(migrationsFolder, `${entry.tag}.sql`);
    const sql = readFileSync(sqlFile, 'utf-8');
    console.log(`[db] Applying migration: ${entry.tag}`);

    sqlite.transaction(() => {
      sqlite.exec(sql);
      sqlite.prepare(
        'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)'
      ).run(entry.tag, Date.now());
    })();
  }

  console.log('[db] Migrations complete');
}

export { sqlite };
export default db;
