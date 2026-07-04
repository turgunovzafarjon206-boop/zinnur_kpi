const express = require('express');
const { neon } = require('@neondatabase/serverless');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function getDb() {
  return neon(process.env.DATABASE_URL);
}

async function initDb() {
  try {
    const sql = getDb();
    await sql`CREATE TABLE IF NOT EXISTS kpi_state (id INTEGER PRIMARY KEY DEFAULT 1, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`INSERT INTO kpi_state (id, data) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING`;
    console.log('✅ Database ready');
  } catch (e) {
    console.error('❌ DB init error:', e.message);
  }
}

app.get('/api/load', async (req, res) => {
  try {
    const sql = getDb();
    const rows = await sql`SELECT data FROM kpi_state WHERE id = 1`;
    res.json(rows.length > 0 && Object.keys(rows[0].data).length > 0 ? rows[0].data : null);
  } catch (e) {
    console.error('Load error:', e.message);
    res.json(null);
  }
});

app.post('/api/save', async (req, res) => {
  try {
    const sql = getDb();
    const data = req.body;
    await sql`INSERT INTO kpi_state (id, data, updated_at) VALUES (1, ${JSON.stringify(data)}::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(data)}::jsonb, updated_at = NOW()`;
    res.json({ ok: true });
  } catch (e) {
    console.error('Save error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

initDb().then(() => {
  app.listen(PORT, () => console.log(`🚀 ZIN-NUR KPI running on port ${PORT}`));
});
