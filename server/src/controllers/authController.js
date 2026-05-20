const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const WORKER_URL = 'https://cimiento-licencias.cliford00001.workers.dev/';

async function _workerSession(action, sessionId) {
  const key = process.env.CIMIENTO_LICENSE_KEY;
  if (!key || !sessionId) return { ok: true };
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${WORKER_URL}?key=${encodeURIComponent(key)}&action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    return await res.json();
  } catch {
    return { ok: true };
  }
}

const login = async (req, res) => {
  const { username, password, session_id } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  try {
    const usuario = await db('usuarios')
      .join('roles', 'usuarios.rol_id', 'roles.id')
      .select(
        'usuarios.id',
        'usuarios.username',
        'usuarios.nombre',
        'usuarios.email',
        'usuarios.password_hash',
        'roles.nombre as rol',
        'roles.permisos'
      )
      .where('usuarios.username', username)
      .where('usuarios.activo', true)
      .first();

    if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, usuario.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    let sesiones = null;
    if (session_id) {
      const r = await _workerSession('register', session_id);
      if (!r.ok && r.error === 'limite_usuarios') {
        return res.status(403).json({
          error: `Límite de usuarios simultáneos alcanzado (${r.activos}/${r.max}). Cerrá sesión en otro equipo e intentá de nuevo.`
        });
      }
      if (r.ok) sesiones = { activos: r.activos, max: r.max };
    }

    const permisos =
      typeof usuario.permisos === 'string'
        ? JSON.parse(usuario.permisos)
        : usuario.permisos;

    const payload = {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      permisos
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, usuario: payload, sesiones });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const logout = async (req, res) => {
  const session_id = req.body?.session_id;
  if (session_id) await _workerSession('unregister', session_id);
  res.json({ message: 'Sesión cerrada' });
};

const heartbeat = async (req, res) => {
  const { session_id } = req.body || {};
  let sesiones = null;
  if (session_id) {
    const r = await _workerSession('register', session_id);
    if (r.ok) sesiones = { activos: r.activos, max: r.max };
  }
  res.json({ ok: true, sesiones });
};

const me = (req, res) => {
  res.json(req.user);
};

module.exports = { login, logout, me, heartbeat };
