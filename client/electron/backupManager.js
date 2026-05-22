const path = require('path');
const fs = require('fs');

const RETENTION_DAYS = 30;

// ── PostgreSQL backup ─────────────────────────────────────────────────────────

function getPgClient() {
  const { DB_PORT, DB_NAME, DB_USER } = require('./dbManager');
  const { Client } = require('pg');
  return new Client({
    host: '127.0.0.1',
    port: DB_PORT,
    user: DB_USER,
    database: DB_NAME,
    password: process.env.DB_PASS
  });
}

async function doBackupPG(backupDir) {
  const client = getPgClient();
  await client.connect();

  try {
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const backup = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      tables: {},
      sequences: {}
    };

    for (const { table_name } of tablesRes.rows) {
      const res = await client.query(`SELECT * FROM "${table_name}"`);
      backup.tables[table_name] = res.rows;
    }

    const seqRes = await client.query(`
      SELECT sequence_name FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);
    for (const { sequence_name } of seqRes.rows) {
      const val = await client.query(`SELECT last_value FROM "${sequence_name}"`);
      backup.sequences[sequence_name] = val.rows[0]?.last_value ?? null;
    }

    return backup;
  } finally {
    await client.end().catch(() => {});
  }
}

async function doRestorePG(backup) {
  const client = getPgClient();
  await client.connect();

  try {
    await client.query("SET session_replication_role = 'replica'");

    for (const table of Object.keys(backup.tables).reverse()) {
      await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    }

    for (const [table, rows] of Object.entries(backup.tables)) {
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]);
      const colList = columns.map((c) => `"${c}"`).join(', ');
      for (const row of rows) {
        const values = columns.map((c) => row[c]);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(
          `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`,
          values
        );
      }
    }

    for (const [seq, val] of Object.entries(backup.sequences)) {
      if (val !== null && val !== undefined) {
        await client.query(`SELECT setval($1, $2, true)`, [seq, val]);
      }
    }
  } finally {
    await client.query("SET session_replication_role = 'origin'").catch(() => {});
    await client.end().catch(() => {});
  }
}

// ── SQLite backup ─────────────────────────────────────────────────────────────

async function doBackupSQLite(backupDir) {
  const Database = require('better-sqlite3');
  const db = new Database(process.env.DB_PATH, { readonly: true });

  try {
    const backup = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      tables: {},
      sequences: {}
    };

    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'knex_%'
      ORDER BY name
    `).all();

    for (const { name } of tables) {
      backup.tables[name] = db.prepare(`SELECT * FROM "${name}"`).all();
    }

    return backup;
  } finally {
    db.close();
  }
}

// Convierte valores de PG (booleans, objetos JSON) a tipos que acepta better-sqlite3
function toSQLiteValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

async function doRestoreSQLite(backup) {
  const Database = require('better-sqlite3');
  const db = new Database(process.env.DB_PATH);

  try {
    db.pragma('foreign_keys = OFF');

    const restore = db.transaction(() => {
      const tableNames = Object.keys(backup.tables).reverse();
      for (const table of tableNames) {
        db.prepare(`DELETE FROM "${table}"`).run();
      }
      // Reiniciar contadores autoincrement
      try { db.prepare(`DELETE FROM sqlite_sequence`).run(); } catch { /* tabla puede no existir */ }

      for (const [table, rows] of Object.entries(backup.tables)) {
        if (!rows.length) continue;
        const columns = Object.keys(rows[0]);
        const colList = columns.map((c) => `"${c}"`).join(', ');
        const placeholders = columns.map(() => '?').join(', ');
        const stmt = db.prepare(`INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`);
        for (const row of rows) {
          stmt.run(columns.map((c) => toSQLiteValue(row[c])));
        }
      }
    });

    restore();
  } finally {
    db.pragma('foreign_keys = ON');
    db.close();
  }
}

// ── API pública ───────────────────────────────────────────────────────────────

async function doBackup(backupDir) {
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const IS_SQLITE = process.env.CIMIENTO_DB === 'sqlite';
  const backup = IS_SQLITE ? await doBackupSQLite(backupDir) : await doBackupPG(backupDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup-${timestamp}.json`;
  fs.writeFileSync(path.join(backupDir, filename), JSON.stringify(backup));

  pruneBackups(backupDir);
  return filename;
}

async function doRestore(backupDir, filename) {
  const filepath = path.join(backupDir, filename);
  if (!fs.existsSync(filepath)) throw new Error('Archivo de backup no encontrado');

  if (filename.endsWith('.dump')) {
    throw new Error('El formato .dump (versión anterior) ya no es compatible. Solo se pueden restaurar backups .json.');
  }

  const backup = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  if (!backup.tables) throw new Error('Formato de backup inválido');

  const IS_SQLITE = process.env.CIMIENTO_DB === 'sqlite';
  if (IS_SQLITE) {
    await doRestoreSQLite(backup);
  } else {
    await doRestorePG(backup);
  }
}

async function doRestoreFromPath(absolutePath) {
  if (!fs.existsSync(absolutePath)) throw new Error('Archivo no encontrado');
  const backup = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
  if (!backup.tables) throw new Error('Formato de backup inválido');
  const IS_SQLITE = process.env.CIMIENTO_DB === 'sqlite';
  if (IS_SQLITE) await doRestoreSQLite(backup);
  else await doRestorePG(backup);
}

function listBackups(backupDir) {
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir)
    .filter((f) => f.endsWith('.json') || f.endsWith('.dump'))
    .map((f) => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { filename: f, size: stat.size, date: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function pruneBackups(backupDir) {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const f of listBackups(backupDir)) {
    if (new Date(f.date).getTime() < cutoff) {
      try { fs.unlinkSync(path.join(backupDir, f.filename)); } catch { /* ignore */ }
    }
  }
}

function scheduleAutoBackup(backupDir) {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(2, 0, 0, 0);
  const msUntilNext = Math.max(next - now, 60 * 1000);

  setTimeout(async () => {
    try { await doBackup(backupDir); } catch { /* non-critical */ }
    scheduleAutoBackup(backupDir);
  }, msUntilNext);
}

module.exports = { doBackup, doRestore, doRestoreFromPath, listBackups, scheduleAutoBackup };
