const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const crypto = require('crypto');

const isDev = process.env.NODE_ENV === 'development';

// ── Mode detection ────────────────────────────────────────────────────────────
// Server build includes a 'server-mode.flag' in resources.
function isServerMode() {
  if (isDev) return process.env.SERVER_MODE === 'true';
  return fs.existsSync(path.join(process.resourcesPath, 'server-mode.flag'));
}

// ── Paths ─────────────────────────────────────────────────────────────────────
const userData = app.getPath('userData');
const configPath = path.join(userData, 'app-config.json');
const pgDataDir = path.join(userData, 'pgdata');
const backupDir = path.join(userData, 'backups');

function getServerDir() {
  if (isDev) return path.resolve(__dirname, '../../server');
  return path.join(process.resourcesPath, 'server');
}

// ── Config helpers ────────────────────────────────────────────────────────────
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

// ── Local IP ──────────────────────────────────────────────────────────────────
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

// ── Health check ──────────────────────────────────────────────────────────────
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

// ── Windows ───────────────────────────────────────────────────────────────────
let mainWindow = null;
let splashWindow = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 340,
    frame: false,
    resizable: false,
    center: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });

  if (isDev) {
    splashWindow.loadURL('http://localhost:5173/splash');
  } else {
    splashWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/splash' });
  }
}

function createMainWindow(serverUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
      splashWindow = null;
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
function setupIPC(mode, serverUrl) {
  ipcMain.on('get-mode', (e) => { e.returnValue = mode; });
  ipcMain.on('get-server-url', (e) => { e.returnValue = serverUrl; });
  ipcMain.on('get-local-ip', (e) => { e.returnValue = getLocalIP(); });
  ipcMain.on('backup-get-dir', (e) => { e.returnValue = backupDir; });

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

  // Backup handlers (server mode only)
  if (mode === 'server') {
    const { doBackup, doRestore, listBackups } = require('./backupManager');

    ipcMain.handle('backup-do', async () => {
      const filename = await doBackup(backupDir);
      return { ok: true, filename };
    });

    ipcMain.handle('backup-list', async () => {
      return listBackups(backupDir);
    });

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
}

// ── Server mode boot ──────────────────────────────────────────────────────────
async function bootServerMode() {
  createSplashWindow();

  const sendStatus = (msg) => {
    if (splashWindow && !splashWindow.isDestroyed())
      splashWindow.webContents.send('boot-status', msg);
  };

  try {
    const { startDatabase, runMigrations } = require('./dbManager');

    const { isFirstRun } = await startDatabase(pgDataDir, configPath, sendStatus);

    const serverDir = getServerDir();

    if (isFirstRun) {
      await runMigrations(serverDir, sendStatus);
    }

    sendStatus('Iniciando servidor...');

    // Set env vars for Express server
    process.env.NODE_ENV = 'production';
    process.env.PORT = '3001';
    process.env.JWT_SECRET = getOrCreateJwtSecret();
    process.env.ALLOWED_ORIGINS = '*';

    // Load and start Express in-process
    // Set server dir in PATH so requires work properly
    const serverEntry = path.join(serverDir, 'src', 'index.js');
    // Temporarily patch Module paths so server's requires resolve from serverDir
    const Module = require('module');
    const originalResolve = Module._resolveFilename.bind(Module);
    Module._resolveFilename = function (request, parent, ...args) {
      try { return originalResolve(request, parent, ...args); }
      catch (e) {
        // Try resolving from serverDir/node_modules
        const fakeparent = { id: path.join(serverDir, 'src', 'fake.js'), filename: path.join(serverDir, 'src', 'fake.js'), paths: Module._nodeModulePaths(path.join(serverDir, 'src')) };
        return originalResolve(request, fakeparent, ...args);
      }
    };
    require(serverEntry);
    Module._resolveFilename = originalResolve; // restore

    sendStatus('Verificando conexión...');
    await waitForServer('http://127.0.0.1:3001/api/health');

    const { scheduleAutoBackup } = require('./backupManager');
    scheduleAutoBackup(backupDir);

    const serverUrl = 'http://127.0.0.1:3001';
    setupIPC('server', serverUrl);

    if (splashWindow && !splashWindow.isDestroyed())
      splashWindow.webContents.send('boot-complete');

    createMainWindow(serverUrl);
  } catch (err) {
    if (splashWindow && !splashWindow.isDestroyed())
      splashWindow.webContents.send('boot-error', err.message);
    console.error('Boot error:', err);
  }
}

// ── Client mode boot ──────────────────────────────────────────────────────────
async function bootClientMode() {
  const cfg = loadConfig();
  const serverUrl = cfg.serverUrl || null;
  setupIPC('client', serverUrl);
  createMainWindow(serverUrl);
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  if (isServerMode()) {
    await bootServerMode();
  } else {
    await bootClientMode();
  }
});

app.on('window-all-closed', async () => {
  if (isServerMode()) {
    try {
      const { stopDatabase } = require('./dbManager');
      await stopDatabase();
    } catch { /* ignore */ }
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    isServerMode() ? bootServerMode() : bootClientMode();
  }
});

// ── Auto-updater ──────────────────────────────────────────────────────────────
if (!isDev) {
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualización disponible',
      message: 'Se descargó una nueva versión. ¿Instalar ahora?',
      buttons: ['Instalar y reiniciar', 'Más tarde']
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message);
  });

  // Chequear actualizaciones al iniciar y cada 4 horas
  app.whenReady().then(() => {
    setTimeout(() => autoUpdater.checkForUpdates(), 10000);
    setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
  });
}
