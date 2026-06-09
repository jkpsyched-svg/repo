/**
 * PERSONAL XO — DB RESEED SCRIPT
 * Usage: Stop npm run dev first, then run: node scripts/reseed.mjs
 * This clears all data and re-applies real subscription/project data on next app start.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'personal_xo.db');

console.log('📦 Personal XO — DB Reseed');
console.log(`   DB path: ${DB_PATH}`);

const db = new Database(DB_PATH);

// Add new columns if they don't exist (idempotent)
const addCols = [
  "ALTER TABLE subscriptions ADD COLUMN billing_cycle TEXT",
  "ALTER TABLE subscriptions ADD COLUMN next_billing_date TEXT",
];
for (const sql of addCols) {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
}

// Clear all data
db.exec(`
  DELETE FROM transactions;
  DELETE FROM subscriptions;
  DELETE FROM decisions;
  DELETE FROM projects;
  DELETE FROM alerts;
  DELETE FROM daily_briefs;
  DELETE FROM _meta WHERE key = 'seeded';
`);

// Reset autoincrement counters
db.exec(`
  DELETE FROM sqlite_sequence WHERE name IN
    ('transactions','subscriptions','decisions','projects','alerts','daily_briefs');
`);

db.close();
console.log('✅ DB cleared. Restart npm run dev — app will auto-seed with real data.');
