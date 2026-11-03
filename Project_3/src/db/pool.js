import mysql from 'mysql2/promise';
import config from '../config.js';

// Creating the pool does not open a connection; the first query (or pingDatabase) does.
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: config.db.connectionLimit,
  waitForConnections: true,
  queueLimit: 0,
  connectTimeout: 10_000,
  enableKeepAlive: true,
  // Return DECIMAL columns (latitude, longitude, AVG ratings) as JS numbers instead of strings.
  decimalNumbers: true,
  charset: 'utf8mb4',
});

export async function pingDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

export function closePool() {
  return pool.end();
}

export default pool;
