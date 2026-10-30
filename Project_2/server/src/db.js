import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

export const databaseFile = config.databaseFile || path.join(config.dataDir, 'space.db');

if (databaseFile !== ':memory:') {
  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
}

export const db = new Database(databaseFile);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const now = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

// Append new entries to change the schema; each one runs exactly once per database file.
const migrations = [
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (${now})
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (${now}),
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_user_id ON sessions(user_id);

  CREATE TABLE favorites (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type  TEXT NOT NULL CHECK (item_type IN ('planet', 'mission')),
    item_id    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (${now}),
    PRIMARY KEY (user_id, item_type, item_id)
  );

  CREATE TABLE api_cache (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  );
  `,
];

const applied = db.pragma('user_version', { simple: true });
for (let version = applied; version < migrations.length; version++) {
  db.transaction(() => {
    db.exec(migrations[version]);
    db.pragma(`user_version = ${version + 1}`);
  })();
}
