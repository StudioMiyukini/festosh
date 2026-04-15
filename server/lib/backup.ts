/**
 * Database backup system with daily scheduling and redundancy.
 *
 * Features:
 * - SQLite online backup API (safe while DB is in use)
 * - Daily automatic backups (configurable interval)
 * - Keeps N most recent backups (rotation)
 * - Redundant copy to a secondary directory
 * - Integrity verification via SHA-256 checksum
 * - Startup backup on server launch
 */

import { existsSync, mkdirSync, readdirSync, unlinkSync, copyFileSync, readFileSync } from 'fs';
import { resolve, join, basename } from 'path';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const DB_PATH = resolve(process.cwd(), process.env.DATABASE_PATH || './data/festosh.db');
const BACKUP_DIR = resolve(process.cwd(), process.env.BACKUP_DIR || './data/backups');
const BACKUP_REDUNDANCY_DIR = resolve(process.cwd(), process.env.BACKUP_REDUNDANCY_DIR || './data/backups-redundant');
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '14', 10); // Keep 14 days
const BACKUP_INTERVAL_MS = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24', 10) * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Ensure backup directories exist
// ---------------------------------------------------------------------------
function ensureDirs() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  mkdirSync(BACKUP_REDUNDANCY_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Generate SHA-256 checksum of a file
// ---------------------------------------------------------------------------
function fileChecksum(filePath: string): string {
  const data = readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ---------------------------------------------------------------------------
// Perform a backup using SQLite's backup API (safe during writes)
// ---------------------------------------------------------------------------
export function performBackup(): { success: boolean; path?: string; checksum?: string; error?: string } {
  try {
    ensureDirs();

    if (!existsSync(DB_PATH)) {
      return { success: false, error: `Database not found: ${DB_PATH}` };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFilename = `festosh-backup-${timestamp}.db`;
    const backupPath = join(BACKUP_DIR, backupFilename);
    const redundantPath = join(BACKUP_REDUNDANCY_DIR, backupFilename);

    // Use SQLite's backup API via better-sqlite3 for online-safe backup
    const { sqlite } = require('../db/index.js');
    sqlite.backup(backupPath)
      .then(() => {
        console.log(`[backup] Primary backup created: ${backupFilename}`);

        // Verify integrity with checksum
        const checksum = fileChecksum(backupPath);
        console.log(`[backup] Checksum (SHA-256): ${checksum}`);

        // Redundant copy
        try {
          copyFileSync(backupPath, redundantPath);
          const redundantChecksum = fileChecksum(redundantPath);

          if (checksum === redundantChecksum) {
            console.log(`[backup] Redundant copy verified: ${redundantPath}`);
          } else {
            console.error('[backup] WARNING: Redundant copy checksum mismatch!');
          }
        } catch (copyErr) {
          console.error('[backup] Failed to create redundant copy:', copyErr);
        }

        // Rotate old backups
        rotateBackups(BACKUP_DIR);
        rotateBackups(BACKUP_REDUNDANCY_DIR);
      })
      .catch((err: Error) => {
        console.error('[backup] SQLite backup failed:', err);
      });

    return { success: true, path: backupPath };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[backup] Backup failed:', msg);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Synchronous backup (for startup)
// ---------------------------------------------------------------------------
export function performBackupSync(): { success: boolean; path?: string; checksum?: string; error?: string } {
  try {
    ensureDirs();

    if (!existsSync(DB_PATH)) {
      return { success: false, error: `Database not found: ${DB_PATH}` };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFilename = `festosh-backup-${timestamp}.db`;
    const backupPath = join(BACKUP_DIR, backupFilename);
    const redundantPath = join(BACKUP_REDUNDANCY_DIR, backupFilename);

    // Synchronous copy for startup backup
    copyFileSync(DB_PATH, backupPath);
    console.log(`[backup] Startup backup created: ${backupFilename}`);

    // Verify integrity
    const checksum = fileChecksum(backupPath);
    console.log(`[backup] Checksum (SHA-256): ${checksum}`);

    // Redundant copy
    try {
      copyFileSync(backupPath, redundantPath);
      const redundantChecksum = fileChecksum(redundantPath);
      if (checksum !== redundantChecksum) {
        console.error('[backup] WARNING: Redundant copy checksum mismatch!');
      } else {
        console.log(`[backup] Redundant copy verified`);
      }
    } catch (copyErr) {
      console.error('[backup] Failed to create redundant copy:', copyErr);
    }

    // Rotate old backups
    rotateBackups(BACKUP_DIR);
    rotateBackups(BACKUP_REDUNDANCY_DIR);

    return { success: true, path: backupPath, checksum };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[backup] Startup backup failed:', msg);
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Rotate backups — keep only the N most recent
// ---------------------------------------------------------------------------
function rotateBackups(dir: string) {
  try {
    const files = readdirSync(dir)
      .filter((f) => f.startsWith('festosh-backup-') && f.endsWith('.db'))
      .sort()
      .reverse(); // Newest first (ISO timestamp sorts correctly)

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      for (const file of toDelete) {
        const filePath = join(dir, file);
        unlinkSync(filePath);
        console.log(`[backup] Rotated old backup: ${file}`);
      }
    }
  } catch (err) {
    console.error('[backup] Rotation error:', err);
  }
}

// ---------------------------------------------------------------------------
// List available backups
// ---------------------------------------------------------------------------
export function listBackups(): { filename: string; size: number; created: string }[] {
  ensureDirs();
  try {
    const { statSync } = require('fs');
    return readdirSync(BACKUP_DIR)
      .filter((f: string) => f.startsWith('festosh-backup-') && f.endsWith('.db'))
      .sort()
      .reverse()
      .map((f: string) => {
        const stat = statSync(join(BACKUP_DIR, f));
        return {
          filename: f,
          size: stat.size,
          created: stat.mtime.toISOString(),
        };
      });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Schedule automatic daily backups
// ---------------------------------------------------------------------------
let backupInterval: ReturnType<typeof setInterval> | null = null;

export function startBackupSchedule() {
  console.log(`[backup] Scheduling automatic backups every ${BACKUP_INTERVAL_MS / 3600000}h (keeping ${MAX_BACKUPS} backups)`);

  // Initial backup on startup
  performBackupSync();

  // Schedule recurring backups
  backupInterval = setInterval(() => {
    console.log('[backup] Running scheduled backup...');
    performBackup();
  }, BACKUP_INTERVAL_MS);
}

export function stopBackupSchedule() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    console.log('[backup] Backup schedule stopped');
  }
}
