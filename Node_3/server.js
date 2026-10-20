import express from 'express';
import { pool, testConnection } from './db.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

// Escape values before putting them into HTML
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);

// ---------- HTML page: shows the query result in a table ----------
app.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, created_at FROM users ORDER BY id'
  );

  const tableRows = rows
    .map(
      (u) => `<tr>
        <td>${u.id}</td>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${new Date(u.created_at).toLocaleString()}</td>
      </tr>`
    )
    .join('');

  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Node + MySQL</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; border-bottom: 1px solid #ddd; text-align: left; }
    th { background: #f4f4f4; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Users from MySQL</h1>
  <p>${rows.length} row(s) from <code>${escapeHtml(process.env.DB_NAME ?? 'node_demo')}.users</code></p>
  <table>
    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Created</th></tr></thead>
    <tbody>${tableRows || '<tr><td colspan="4">No users yet</td></tr>'}</tbody>
  </table>
  <p>JSON: <a href="/api/users">/api/users</a> · Health: <a href="/health">/health</a></p>
</body>
</html>`);
});

// ---------- JSON API ----------
app.get('/health', async (req, res) => {
  const [rows] = await pool.query('SELECT NOW() AS serverTime, VERSION() AS mysqlVersion');
  res.json({ status: 'ok', db: rows[0] });
});

app.get('/api/users', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, created_at FROM users ORDER BY id'
  );
  res.json(rows);
});

app.get('/api/users/:id', async (req, res) => {
  // execute() + ? placeholders = prepared statement (safe from SQL injection)
  const [rows] = await pool.execute(
    'SELECT id, name, email, created_at FROM users WHERE id = ?',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

app.post('/api/users', async (req, res) => {
  const { name, email } = req.body ?? {};
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  const [result] = await pool.execute(
    'INSERT INTO users (name, email) VALUES (?, ?)',
    [name, email]
  );
  res.status(201).json({ id: result.insertId, name, email });
});

// ---------- Error handler ----------
// Express 5 forwards errors thrown in async handlers here automatically.
app.use((err, req, res, next) => {
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Email already exists' });
  }
  console.error(err);
  res.status(500).json({ error: err.code ?? 'INTERNAL_ERROR', message: err.message });
});

// ---------- Start ----------
try {
  await testConnection();
  console.log('✅ Connected to MySQL');
} catch (err) {
  console.error('❌ Could not connect to MySQL:', err.code, '-', err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});