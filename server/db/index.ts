import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
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
 * Run pending Drizzle migrations.
 * Call this once at server startup before handling requests.
 */
export function initializeDatabase(): void {
  const migrationsFolder = resolve(import.meta.dirname ?? __dirname, 'migrations');
  console.log(`[db] Running migrations from ${migrationsFolder}`);
  migrate(db, { migrationsFolder });
  console.log('[db] Migrations complete');
}

export { sqlite };
export default db;
