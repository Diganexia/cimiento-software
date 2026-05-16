/**
 * Backup y restauración usando pg_dump / pg_restore.
 * Guarda backups en userData/backups con retención de 30 días.
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const RETENTION_DAYS = 30;

function pgExe(name) {
  const { getPgBinDir } = require('./dbManager');
  const binDir = getPgBinDir();
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  if (binDir) {
    const full = path.join(binDir, exe);
    if (fs.existsSync(full)) return full;
  }
  // Último intento: buscar en PATH
  // Si tampoco está, el execFile fallará con ENOENT y se captura en el llamador
  return exe;
}

function runExe(exePath, args, env) {
  return new Promise((resolve, reject) => {
    execFile(exePath, args, { env, timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        const msg = err.code === 'ENOENT'
          ? `No se encontró el ejecutable: ${exePath}. Verificá que la base de datos embebida esté correctamente instalada.`
          : (stderr || err.message);
        reject(new Error(msg));
      } else {
        resolve(stdout);
      }
    });
  });
}

function buildEnv(dbPassword) {
  const { DB_PORT, DB_NAME, DB_USER } = require('./dbManager');
  return {
    ...process.env,
    PGPASSWORD: dbPassword || process.env.DB_PASS,
    PGHOST: '127.0.0.1',
    PGPORT: String(DB_PORT),
    PGDATABASE: DB_NAME,
    PGUSER: DB_USER
  };
}

async function doBackup(backupDir) {
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup-${timestamp}.dump`;
  const filepath = path.join(backupDir, filename);

  const { DB_NAME } = require('./dbManager');
  const env = buildEnv();
  const pgDumpPath = pgExe('pg_dump');
  console.log('[backup] usando pg_dump:', pgDumpPath);

  await runExe(pgDumpPath, [
    '-h', '127.0.0.1',
    '-p', String(process.env.DB_PORT || 5433),
    '-U', process.env.DB_USER || 'corralon',
    '-F', 'c', // custom format (compressed)
    '-f', filepath,
    DB_NAME
  ], env);

  // Purge old backups
  pruneBackups(backupDir);

  return filename;
}

async function doRestore(backupDir, filename) {
  const filepath = path.join(backupDir, filename);
  if (!fs.existsSync(filepath)) throw new Error('Archivo de backup no encontrado');

  const { DB_NAME } = require('./dbManager');
  const env = buildEnv();

  // Drop all connections and recreate database
  await runExe(pgExe('psql'), [
    '-h', '127.0.0.1',
    '-p', String(process.env.DB_PORT || 5433),
    '-U', process.env.DB_USER || 'corralon',
    '-d', 'postgres',
    '-c', `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();`
  ], env).catch(() => {});

  await runExe(pgExe('dropdb'), [
    '-h', '127.0.0.1', '-p', String(process.env.DB_PORT || 5433),
    '-U', process.env.DB_USER || 'corralon',
    '--if-exists', DB_NAME
  ], env);

  await runExe(pgExe('createdb'), [
    '-h', '127.0.0.1', '-p', String(process.env.DB_PORT || 5433),
    '-U', process.env.DB_USER || 'corralon',
    DB_NAME
  ], env);

  await runExe(pgExe('pg_restore'), [
    '-h', '127.0.0.1',
    '-p', String(process.env.DB_PORT || 5433),
    '-U', process.env.DB_USER || 'corralon',
    '-d', DB_NAME,
    '-v',
    filepath
  ], env);
}

function listBackups(backupDir) {
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir)
    .filter((f) => f.endsWith('.dump'))
    .map((f) => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { filename: f, size: stat.size, date: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function pruneBackups(backupDir) {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = listBackups(backupDir);
  for (const f of files) {
    if (new Date(f.date).getTime() < cutoff) {
      try { fs.unlinkSync(path.join(backupDir, f.filename)); } catch { /* ignore */ }
    }
  }
}

// Auto-backup: call once after server starts; schedules daily at 02:00
function scheduleAutoBackup(backupDir) {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(2, 0, 0, 0);
  const msUntilNext = Math.max(next - now, 60 * 1000);

  setTimeout(async () => {
    try { await doBackup(backupDir); } catch { /* non-critical */ }
    scheduleAutoBackup(backupDir); // reschedule
  }, msUntilNext);
}

module.exports = { doBackup, doRestore, listBackups, scheduleAutoBackup };
