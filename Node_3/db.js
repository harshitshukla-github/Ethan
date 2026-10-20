import mysql from 'mysql2/promise';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

// Load credentials before creating the pool, including when run via nodemon.
loadEnvFile(fileURLToPath(new URL('.env', import.meta.url)));

// A pool keeps a few connections open and hands them out per query,
// which is what you want for a web server (vs. a single createConnection).
export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'node_demo',
  waitForConnections: true,
  connectionLimit: 10,
});

// Called once at startup so the app fails fast if MySQL isn't reachable.
export async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}
