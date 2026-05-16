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

function _discoverPgBinDir(pg) {
  const pgExe = process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';

  // 1. Propiedades internas del objeto EmbeddedPostgres (distintas versiones exponen distintas keys)
  const instanceHints = [
    pg.pg_ctl, pg.pg_ctl_path, pg.pgCtlPath, pg.pgBinDir, pg._pg_ctl_path,
    pg._server_module?.pg_ctl_path, pg._server_module?.pgCtlPath,
    pg.settings?.pg_ctl, pg.settings?.pgCtlPath,
    pg.options?.pgCtlPath, pg.options?.pgBinDir,
  ];
  for (const hint of instanceHints.filter((h) => typeof h === 'string')) {
    try {
      const dir = fs.statSync(hint).isDirectory() ? hint : path.dirname(hint);
      if (fs.existsSync(path.join(dir, pgExe))) return dir;
    } catch {}
  }

  // 2. Buscar en todas las ubicaciones conocidas de node_modules
  const nmRoots = [
    path.resolve(__dirname, '../node_modules'),
    path.resolve(__dirname, '../../node_modules'),
  ];
  // En producción (Electron empaquetado)
  try {
    const { app } = require('electron');
    const rp = process.resourcesPath;
    if (rp) {
      nmRoots.push(path.join(rp, 'app', 'node_modules'));
      nmRoots.push(path.join(rp, 'app.asar.unpacked', 'node_modules'));
    }
  } catch {}

  const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux';
  const win32   = process.platform === 'win32' ? 'win32' : null;
  const arch    = process.arch; // 'x64', 'arm64', etc.

  for (const nmRoot of nmRoots) {
    if (!fs.existsSync(nmRoot)) continue;

    const candidates = [
      // embedded-postgres: ubicaciones típicas del paquete principal
      path.join(nmRoot, 'embedded-postgres', 'pg', 'bin'),
      path.join(nmRoot, 'embedded-postgres', 'bin'),
      path.join(nmRoot, 'embedded-postgres', 'dist', 'bin'),
      // Subpaquetes @embedded-postgres/{platform}-{arch}  (v18.x usa "native/bin")
      path.join(nmRoot, '@embedded-postgres', `${platform}-${arch}`, 'native', 'bin'),
      path.join(nmRoot, '@embedded-postgres', `${platform}-${arch}`, 'pg', 'bin'),
      path.join(nmRoot, '@embedded-postgres', `${platform}-${arch}`, 'bin'),
      // Alias win32 (algunos usan "windows", otros "win32")
      win32 && path.join(nmRoot, '@embedded-postgres', `win32-${arch}`, 'native', 'bin'),
      win32 && path.join(nmRoot, '@embedded-postgres', `win32-${arch}`, 'pg', 'bin'),
      win32 && path.join(nmRoot, '@embedded-postgres', `win32-${arch}`, 'bin'),
    ].filter(Boolean);

    for (const dir of candidates) {
      if (fs.existsSync(path.join(dir, pgExe))) return dir;
    }

    // 3. Búsqueda recursiva de 2 niveles dentro del paquete embedded-postgres
    const epPkg = path.join(nmRoot, 'embedded-postgres');
    if (fs.existsSync(epPkg)) {
      try {
        for (const d1 of fs.readdirSync(epPkg)) {
          const p1 = path.join(epPkg, d1);
          if (!fs.statSync(p1).isDirectory()) continue;
          if (fs.existsSync(path.join(p1, pgExe))) return p1;
          try {
            for (const d2 of fs.readdirSync(p1)) {
              const p2 = path.join(p1, d2);
              if (fs.statSync(p2).isDirectory() && fs.existsSync(path.join(p2, pgExe))) return p2;
            }
          } catch {}
        }
      } catch {}
    }

    // 4. Buscar en @embedded-postgres/* dentro de nmRoot
    const epScope = path.join(nmRoot, '@embedded-postgres');
    if (fs.existsSync(epScope)) {
      try {
        for (const pkg of fs.readdirSync(epScope)) {
          for (const sub of ['native/bin', 'pg/bin', 'bin']) {
            const dir = path.join(epScope, pkg, sub);
            if (fs.existsSync(path.join(dir, pgExe))) return dir;
          }
        }
      } catch {}
    }
  }

  console.error('[dbManager] No se pudo encontrar pg_dump. Los backups no estarán disponibles.');
  return null;
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
  pgBinDir = _discoverPgBinDir(pg);

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
