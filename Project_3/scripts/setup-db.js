/*
• Creates the database named in DB_NAME (if needed) and applies db/schema.sql.
• npm run db:setup   schema only (safe to re-run, never drops data)
• npm run db:seed    schema + demo data from db/seed.sql (skipped if locations already has rows)
• npm run db:reset   DROPS users, locations and reviews, then recreates and seeds them
*/
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import config from '../src/config.js';

const args = new Set(process.argv.slice(2));
const shouldSeed = args.has('--seed');
const shouldReset = args.has('--reset');

const { host, port, user, password, database } = config.db;

function readSql(fileName) {
  return readFile(new URL(`../db/${fileName}`, import.meta.url), 'utf8');
}

async function main() {
  // The name is interpolated into CREATE DATABASE / USE, so only allow plain identifiers.
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error(`DB_NAME "${database}" may only contain letters, digits and underscores.`);
  }

  const connection = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    await connection.query(`USE \`${database}\``);

    if (shouldReset) {
      await connection.query('DROP TABLE IF EXISTS reviews, locations, users');
      console.log(`Dropped existing tables in "${database}".`);
    }

    await connection.query(await readSql('schema.sql'));
    console.log(`Schema applied to "${database}" on ${host}:${port}.`);

    if (shouldSeed) {
      const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM locations');
      if (total > 0) {
        console.log(`Skipped demo data: "locations" already has ${total} row(s). Use "npm run db:reset" to start fresh.`);
      } else {
        await connection.query(await readSql('seed.sql'));
        console.log('Demo data loaded.');
      }
    }
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(`Database setup failed: ${err.code ? `[${err.code}] ` : ''}${err.message}`);
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('Check DB_USER and DB_PASSWORD in .env.');
  } else if (err.code === 'ECONNREFUSED') {
    console.error(`Is MySQL running and listening on ${host}:${port}?`);
  }
  process.exitCode = 1;
});
