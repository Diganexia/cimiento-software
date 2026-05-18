const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // ── Mode & config ──────────────────────────────────────────────────────────
  getMode: () => ipcRenderer.sendSync('get-mode'),
  getServerUrl: () => ipcRenderer.sendSync('get-server-url'),
  saveMode: (mode) => ipcRenderer.invoke('save-mode', mode),
  saveServerUrl: (url) => ipcRenderer.invoke('save-server-url', url),
  testConnection: (url) => ipcRenderer.invoke('test-connection', url),
  discoverServer: () => ipcRenderer.invoke('discover-server'),
  getLocalIP: () => ipcRenderer.sendSync('get-local-ip'),

  // ── Boot status (server mode) ─────────────────────────────────────────────
  onBootStatus: (cb) => {
    const handler = (_event, status) => cb(status);
    ipcRenderer.on('boot-status', handler);
    return () => ipcRenderer.removeListener('boot-status', handler);
  },
  onBootComplete: (cb) => {
    const handler = () => cb();
    ipcRenderer.once('boot-complete', handler);
  },
  onBootError: (cb) => {
    const handler = (_event, msg) => cb(msg);
    ipcRenderer.once('boot-error', handler);
  },

  // ── PDF ───────────────────────────────────────────────────────────────────
  savePdf: (tipo, filename, buffer) => ipcRenderer.invoke('save-pdf', { tipo, filename, buffer }),
  getPdfPath: () => ipcRenderer.invoke('get-pdf-path'),
  setPdfPath: (newPath) => ipcRenderer.invoke('set-pdf-path', newPath),
  pickPdfFolder: () => ipcRenderer.invoke('pick-pdf-folder'),

  // ── Backup ────────────────────────────────────────────────────────────────
  doBackup: () => ipcRenderer.invoke('backup-do'),
  listBackups: () => ipcRenderer.invoke('backup-list'),
  restoreBackup: (filename) => ipcRenderer.invoke('backup-restore', filename),
  deleteBackup: (filename) => ipcRenderer.invoke('backup-delete', filename),
  getBackupDir: () => ipcRenderer.sendSync('backup-get-dir')
});
