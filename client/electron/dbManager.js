/**
 * Gestiona PostgreSQL embebido (embedded-postgres).
 * Solo se usa en el build de servidor.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let pg = null;
let pgBinDir = null;

const DB_USER = 'corralon';
const DB_NAME = 'corralon';
const DB_PORT = 5433;

function getOrCreateDbPassword(configPath) {
  try {
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.dbPassword) return cfg.dbPassword;
    }
    const pass = crypto.randomBytes(20).toString('hex');
    const existing = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : {};
    fs.writeFileSync(configPath, JSON.stringify({ ...existing, dbPassword: pass }, null, 2));
    return pass;
  } catch {
    return 'corralon_default_pass_2024';
  }
}

async function startDatabase(dataDir, configPath, onStatus) {
  // embedded-postgres es ESM-only, usar import() dinámico
  const { default: EmbeddedPostgres } = await import('embedded-postgres');

  const dbPassword = getOrCreateDbPassword(configPath);
  const isFirstRun = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));

  onStatus('Iniciando base de datos...');

  pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: DB_USER,
    password: dbPassword,
    port: DB_PORT,
    persistent: true
  });

  if (isFirstRun) {
    onStatus('Inicializando base de datos por primera vez...');
    await pg.initialise();
    await pg.start();
    await pg.createDatabase(DB_NAME);
  } else {
    await pg.start();
  }

  // Discover pg_dump binary path
  try {
    const pgCtlPath = pg._server_module?.pg_ctl_path || pg.pg_ctl || null;
    if (pgCtlPath) {
      pgBinDir = path.dirname(pgCtlPath);
    } else {
      // Buscar en node_modules conocidos
      const candidates = [
        path.resolve(__dirname, '../../node_modules/embedded-postgres'),
        path.resolve(__dirname, '../../../node_modules/embedded-postgres'),
      ];
      for (const epkgDir of candidates) {
        if (!fs.existsSync(epkgDir)) continue;
        for (const sub of ['pg/bin', '../bin', 'dist/bin']) {
          const p = path.join(epkgDir, sub);
          if (fs.existsSync(p)) { pgBinDir = p; break; }
        }
        if (pgBinDir) break;
      }
    }
  } catch { /* pg_dump no es crítico para el arranque */ }

  // Exponer conexión vía process.env para el servidor Express
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = String(DB_PORT);
  process.env.DB_NAME = DB_NAME;
  process.env.DB_USER = DB_USER;
  process.env.DB_PASS = dbPassword;
  process.env.DB_SSL = 'false';

  return { isFirstRun, dbPassword };
}

async function runMigrations(serverDir, onStatus) {
  onStatus('Ejecutando migraciones de base de datos...');

  const knex = require('knex');
  const knexfile = require(path.join(serverDir, 'database', 'knexfile.js'));
  const db = knex(knexfile.production);

  try {
    // Always run migrate.latest() — it's idempotent and safe to call every boot.
    // This handles the case where a previous boot failed mid-migration.
    await db.migrate.latest();

    // Only seed if the roles table is empty (avoids duplicate data on re-runs)
    const rolesCount = await db('roles').count('id as n').first();
    if (!rolesCount || Number(rolesCount.n) === 0) {
      onStatus('Cargando datos iniciales...');
      await db.seed.run();
    }
  } finally {
    await db.destroy();
  }
}

async function stopDatabase() {
  if (pg) {
    try { await pg.stop(); } catch { /* ignore */ }
    pg = null;
  }
}

function getPgBinDir() {
  return pgBinDir;
}

module.exports = { startDatabase, runMigrations, stopDatabase, getPgBinDir, DB_PORT, DB_NAME, DB_USER };
