const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const dgram = require('dgram');

const isDev = process.env.NODE_ENV === 'development';

// ── Logger ────────────────────────────────────────────────────────────────────
let _logFile = null;
function getLogFile() {
  if (_logFile) return _logFile;
  const logDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  _logFile = path.join(logDir, `app-${new Date().toISOString().slice(0, 10)}.log`);
  return _logFile;
}
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(getLogFile(), line); } catch { /* ignore */ }
}
function logError(...args) {
  const line = `[${new Date().toISOString()}] ERROR ${args.join(' ')}\n`;
  process.stderr.write(line);
  try { fs.appendFileSync(getLogFile(), line); } catch { /* ignore */ }
}

const _origLog = console.log;
const _origError = console.error;
console.log = (...args) => { _origLog(...args); try { log(...args); } catch {} };
console.error = (...args) => { _origError(...args); try { logError(...args); } catch {} };

process.on('uncaughtException', (err) => { logError('uncaughtException:', err.stack || err.message); });
process.on('unhandledRejection', (reason) => { logError('unhandledRejection:', reason?.stack || reason); });

// ── Paths ─────────────────────────────────────────────────────────────────────
const userData = app.getPath('userData');
const configPath = path.join(userData, 'app-config.json');
const backupDir = path.join(userData, 'backups');

function getServerDir() {
  if (isDev) return path.resolve(__dirname, '../../server');
  return path.join(process.resourcesPath, 'server');
}

// ── Config ────────────────────────────────────────────────────────────────────
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch { /* ignore */ }
  return {};
}

function saveConfig(obj) {
  const current = loadConfig();
  fs.writeFileSync(configPath, JSON.stringify({ ...current, ...obj }, null, 2));
}

function getOrCreateJwtSecret() {
  const cfg = loadConfig();
  if (cfg.jwtSecret) return cfg.jwtSecret;
  const secret = crypto.randomBytes(32).toString('hex');
  saveConfig({ jwtSecret: secret });
  return secret;
}

// ── Network helpers ───────────────────────────────────────────────────────────
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

function waitForServer(url, attempts = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode < 500) resolve();
        else retry();
      }).on('error', retry);
    };
    const retry = () => {
      if (++tries >= attempts) return reject(new Error('Servidor no responde'));
      setTimeout(check, delay);
    };
    check();
  });
}

// ── UDP Discovery ─────────────────────────────────────────────────────────────
const DISCOVERY_PORT = 45678;
const DISCOVERY_MSG  = 'CORRALON_DISCOVER';
const DISCOVERY_ACK  = 'CORRALON_SERVER:3001';

let discoverySocket = null;

function startDiscoveryListener() {
  discoverySocket = dgram.createSocket('udp4');
  discoverySocket.on('error', (err) => {
    logError('UDP discovery error:', err.message);
    discoverySocket.close();
    discoverySocket = null;
  });
  discoverySocket.on('message', (msg, rinfo) => {
    if (msg.toString() === DISCOVERY_MSG) {
      const resp = Buffer.from(DISCOVERY_ACK);
      discoverySocket.send(resp, rinfo.port, rinfo.address);
    }
  });
  discoverySocket.bind(DISCOVERY_PORT, () => {
    try { discoverySocket.setBroadcast(true); } catch {}
    log('UDP discovery listener activo en puerto', DISCOVERY_PORT);
  });
}

function discoverServer(timeout = 8000) {
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket('udp4');
    let done = false;

    const finish = (url) => {
      if (done) return;
      done = true;
      try { sock.close(); } catch {}
      if (url) resolve(url);
      else reject(new Error('Servidor no encontrado en la red local'));
    };

    sock.on('error', () => finish(null));
    sock.on('message', (msg, rinfo) => {
      const str = msg.toString();
      if (str.startsWith('CORRALON_SERVER:')) {
        const port = str.split(':')[1];
        finish(`http://${rinfo.address}:${port}`);
      }
    });

    sock.bind(() => {
      try { sock.setBroadcast(true); } catch {}
      const buf = Buffer.from(DISCOVERY_MSG);
      sock.send(buf, DISCOVERY_PORT, '255.255.255.255');
      setTimeout(() => finish(null), timeout);
    });
  });
}

// ── Windows ───────────────────────────────────────────────────────────────────
let mainWindow  = null;
let splashWindow = null;

function createSplashWindow(hash = '/splash') {
  splashWindow = new BrowserWindow({
    width: 500, height: 340, frame: false, resizable: false, center: true,
    backgroundColor: '#111827',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  if (isDev) splashWindow.loadURL(`http://localhost:5173/#${hash}`);
  else splashWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash });
}

function createSetupWindow() {
  splashWindow = new BrowserWindow({
    width: 620, height: 440, frame: false, resizable: false, center: true,
    backgroundColor: '#111827',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  if (isDev) splashWindow.loadURL('http://localhost:5173/#/setup');
  else splashWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/setup' });
}

function createMainWindow(serverUrl) {
  mainWindow = new BrowserWindow({
    width: 1366, height: 768, minWidth: 1366, minHeight: 768, show: false,
    title: 'Cimiento',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  mainWindow.on('page-title-updated', (e) => e.preventDefault());

  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }
  });
}

// ── IPC ───────────────────────────────────────────────────────────────────────
function registerSyncIPC() {
  // Lee dinámicamente desde config para reflejar el estado actual
  ipcMain.on('get-mode', (e) => {
    const cfg = loadConfig();
    e.returnValue = cfg.mode || 'setup';
  });
  ipcMain.on('get-server-url', (e) => {
    const cfg = loadConfig();
    e.returnValue = cfg.serverUrl || null;
  });
  ipcMain.on('get-local-ip', (e) => { e.returnValue = getLocalIP(); });
  ipcMain.on('backup-get-dir', (e) => { e.returnValue = backupDir; });
  ipcMain.on('get-license-key', (e) => {
    const cfg = loadConfig();
    e.returnValue = cfg.licenseKey || null;
  });
}

function registerUniversalAsyncIPC() {
  ipcMain.handle('save-server-url', (_e, url) => {
    saveConfig({ serverUrl: url });
    return true;
  });

  ipcMain.handle('test-connection', async (_e, url) => {
    return new Promise((resolve) => {
      const testUrl = url.replace(/\/$/, '') + '/api/health';
      http.get(testUrl, (res) => {
        resolve({ ok: res.statusCode < 400 });
      }).on('error', (err) => {
        resolve({ ok: false, error: err.message });
      }).setTimeout(5000, function () { this.destroy(); resolve({ ok: false, error: 'Timeout' }); });
    });
  });

  ipcMain.handle('discover-server', async () => {
    try {
      const url = await discoverServer(8000);
      saveConfig({ serverUrl: url });
      return { ok: true, url };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('save-pdf', async (_e, { tipo, filename, buffer }) => {
    const cfg = loadConfig();
    const basePath = cfg.pdfPath || path.join(app.getPath('documents'), 'Cimiento');
    const hoy = new Date();
    const fecha = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`;
    const dir = path.join(basePath, tipo, fecha);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    shell.openPath(filePath);
    return filePath;
  });

  ipcMain.handle('get-pdf-path', () => {
    const cfg = loadConfig();
    return cfg.pdfPath || path.join(app.getPath('documents'), 'Cimiento');
  });

  ipcMain.handle('set-pdf-path', (_e, newPath) => {
    saveConfig({ pdfPath: newPath || '' });
    return true;
  });

  ipcMain.handle('pick-pdf-folder', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Seleccionar carpeta de PDFs'
    });
    if (canceled || !filePaths.length) return null;
    return filePaths[0];
  });

  ipcMain.handle('check-for-updates', () => {
    if (isDev) return { status: 'dev' };
    try {
      require('electron-updater').autoUpdater.checkForUpdates();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('install-update', () => {
    if (isDev) return;
    require('electron-updater').autoUpdater.quitAndInstall();
  });

  ipcMain.handle('save-license-key', (_e, key) => {
    saveConfig({ licenseKey: key });
    return true;
  });
}

function registerServerAsyncIPC() {
  const { doBackup, doRestore, listBackups } = require('./backupManager');

  ipcMain.handle('backup-do', async () => {
    const filename = await doBackup(backupDir);
    return { ok: true, filename };
  });
  ipcMain.handle('backup-list', async () => listBackups(backupDir));
  ipcMain.handle('backup-restore', async (_e, filename) => {
    await doRestore(backupDir, filename);
    return { ok: true };
  });
  ipcMain.handle('backup-delete', async (_e, filename) => {
    const filepath = path.join(backupDir, filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    return { ok: true };
  });
}

// ── Boot: Setup (primera vez) ─────────────────────────────────────────────────
function bootSetup() {
  createSetupWindow();

  ipcMain.handle('save-mode', async (_e, mode) => {
    saveConfig({ mode });
    ipcMain.removeHandler('save-mode');

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }

    if (mode === 'server') {
      await bootServerMode();
    } else {
      await bootClientMode();
    }
    return { ok: true };
  });
}

// ── Boot: Servidor ────────────────────────────────────────────────────────────
async function bootServerMode() {
  createSplashWindow('/splash');

  const sendStatus = (msg) => {
    if (splashWindow && !splashWindow.isDestroyed())
      splashWindow.webContents.send('boot-status', msg);
  };

  try {
    log('Boot: iniciando en modo servidor');
    const { startDatabase, runMigrations } = require('./dbManager');

    const { isFirstRun } = await startDatabase(
      path.join(userData, 'pgdata'), configPath, sendStatus
    );
    log('Boot: base de datos lista, firstRun=', isFirstRun);

    const serverDir = getServerDir();
    const serverEntry = path.join(serverDir, 'src', 'index.js');

    const Module = require('module');
    const originalResolve = Module._resolveFilename.bind(Module);
    const appNodeModules = path.join(__dirname, '..', 'node_modules');
    Module._resolveFilename = function (request, parent, ...args) {
      try { return originalResolve(request, parent, ...args); }
      catch (e) {
        const fakeparent = {
          id: path.join(serverDir, 'src', 'fake.js'),
          filename: path.join(serverDir, 'src', 'fake.js'),
          paths: [
            path.join(serverDir, 'node_modules'),
            appNodeModules,
            ...Module._nodeModulePaths(path.join(serverDir, 'src'))
          ]
        };
        try { return originalResolve(request, fakeparent, ...args); }
        catch { throw e; }
      }
    };

    await runMigrations(serverDir, sendStatus);

    sendStatus('Iniciando servidor...');
    process.env.NODE_ENV = 'production';
    process.env.PORT = '3001';
    process.env.JWT_SECRET = getOrCreateJwtSecret();
    process.env.ALLOWED_ORIGINS = '*';
    process.env.CIMIENTO_LICENSE_KEY = loadConfig().licenseKey || '';
    require(serverEntry);

    sendStatus('Verificando conexión...');
    await waitForServer('http://127.0.0.1:3001/api/health');

    registerServerAsyncIPC();
    startDiscoveryListener();

    const { scheduleAutoBackup } = require('./backupManager');
    scheduleAutoBackup(backupDir);

    saveConfig({ serverUrl: `http://127.0.0.1:3001` });

    if (splashWindow && !splashWindow.isDestroyed())
      splashWindow.webContents.send('boot-complete');

    createMainWindow('http://127.0.0.1:3001');
  } catch (err) {
    logError('Boot error:', err.stack || err.message);
    if (splashWindow && !splashWindow.isDestroyed())
      splashWindow.webContents.send('boot-error', err.message);
  }
}

// ── Boot: Cliente ─────────────────────────────────────────────────────────────
async function bootClientMode() {
  const cfg = loadConfig();

  if (cfg.serverUrl) {
    // URL ya configurada — arrancar directamente
    createMainWindow(cfg.serverUrl);
    return;
  }

  // Sin URL — intentar auto-descubrimiento
  createSplashWindow('/splash');

  const sendStatus = (msg) => {
    if (splashWindow && !splashWindow.isDestroyed())
      splashWindow.webContents.send('boot-status', msg);
  };

  sendStatus('Buscando servidor en la red local...');

  try {
    const serverUrl = await discoverServer(8000);
    saveConfig({ serverUrl });
    log('Boot cliente: servidor encontrado en', serverUrl);
    sendStatus('Servidor encontrado. Conectando...');
    if (splashWindow && !splashWindow.isDestroyed())
      splashWindow.webContents.send('boot-complete');
    createMainWindow(serverUrl);
  } catch (err) {
    log('Boot cliente: servidor no encontrado, mostrando config manual');
    if (splashWindow && !splashWindow.isDestroyed())
      splashWindow.webContents.send('boot-error', 'No se encontró el servidor automáticamente.');
    // La splash mostrará el botón para ir a /server-config
    // createMainWindow se llama desde el handler de save-server-url via reload
  }
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  registerSyncIPC();
  registerUniversalAsyncIPC();

  const cfg = loadConfig();

  if (!cfg.mode) {
    bootSetup();
  } else if (cfg.mode === 'server') {
    await bootServerMode();
  } else {
    await bootClientMode();
  }
});

app.on('window-all-closed', async () => {
  if (loadConfig().mode === 'server') {
    try {
      const { stopDatabase } = require('./dbManager');
      await stopDatabase();
    } catch { /* ignore */ }
    if (discoverySocket) {
      try { discoverySocket.close(); } catch {}
      discoverySocket = null;
    }
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const cfg = loadConfig();
    if (!cfg.mode) bootSetup();
    else if (cfg.mode === 'server') bootServerMode();
    else bootClientMode();
  }
});

// ── Auto-updater ──────────────────────────────────────────────────────────────
if (!isDev) {
  const { autoUpdater } = require('electron-updater');
  autoUpdater.channel = 'latest';
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const sendUpdateStatus = (status, extra = {}) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { status, ...extra });
    }
  };

  autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'));
  autoUpdater.on('update-available', (info) => sendUpdateStatus('available', { version: info.version }));
  autoUpdater.on('update-not-available', () => sendUpdateStatus('not-available'));
  autoUpdater.on('download-progress', (p) => sendUpdateStatus('downloading', { percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus('downloaded', { version: info.version });
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualización lista',
      message: `Nueva versión ${info.version} disponible`,
      detail: 'La actualización ya se descargó. Reiniciá el programa para aplicarla.\n\nPodés hacerlo ahora o más tarde al cerrar el programa.',
      buttons: ['Reiniciar ahora', 'Más tarde'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });
  autoUpdater.on('error', (err) => {
    logError('Auto-updater error:', err.message);
    sendUpdateStatus('error', { error: err.message });
  });

  app.whenReady().then(() => {
    setTimeout(() => autoUpdater.checkForUpdates(), 10000);
    setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
  });
}
