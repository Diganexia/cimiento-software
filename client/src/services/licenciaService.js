const WORKER_URL = 'https://cimiento-licencias.cliford00001.workers.dev/';
const CACHE_KEY = 'licencia_cache';
const GRACE_DAYS = 7;
const CLOCK_TOLERANCE_MS = 12 * 60 * 60 * 1000;

export function getLicenseKey() {
  return window.electronAPI?.getLicenseKey?.() ?? null;
}

export async function saveLicenseKey(key) {
  if (window.electronAPI?.saveLicenseKey) {
    await window.electronAPI.saveLicenseKey(key);
  }
}

export function getSessionId() {
  let id = localStorage.getItem('cimiento_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('cimiento_session_id', id);
  }
  return id;
}

export async function registerSession(key) {
  const sessionId = getSessionId();
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${WORKER_URL}?key=${encodeURIComponent(key)}&action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
      signal: controller.signal,
    });
    clearTimeout(tid);
    return await res.json();
  } catch {
    return { ok: true }; // sin conexión → offline grace lo maneja
  }
}

export async function unregisterSession(key) {
  const sessionId = getSessionId();
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    await fetch(`${WORKER_URL}?key=${encodeURIComponent(key)}&action=unregister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
      signal: controller.signal,
    });
    clearTimeout(tid);
  } catch {}
}

export async function checkLicencia(key) {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${WORKER_URL}?key=${encodeURIComponent(key)}`, { signal: controller.signal });
    clearTimeout(tid);
    const data = await res.json();

    if (Math.abs(Date.now() - data.serverTime) > CLOCK_TOLERANCE_MS) {
      return _fromCache(key) ?? { valida: false, estado: 'offline', mensaje: 'Reloj del sistema incorrecto', source: 'bad_clock' };
    }

    const result = { ...data, key, lastCheck: data.serverTime, source: 'online' };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch {}
    return result;
  } catch {
    return _fromCache(key) ?? {
      valida: false, estado: 'offline',
      mensaje: 'Sin conexión con el servidor de licencias',
      source: 'offline_no_cache'
    };
  }
}

function _fromCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (cache.key !== key) return null;
    const ageDays = (Date.now() - cache.lastCheck) / 86400000;
    if (ageDays > GRACE_DAYS) {
      return {
        valida: false,
        estado: 'offline_expirado',
        mensaje: `Sin conexión hace más de ${GRACE_DAYS} días. Contacte a su proveedor.`,
        source: 'offline_expired'
      };
    }
    return { ...cache, source: 'cached', diasOffline: Math.floor(ageDays) };
  } catch {
    return null;
  }
}
