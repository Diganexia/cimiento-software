const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function listar(req, res) {
  try {
    const usuarios = await db('usuarios as u')
      .join('roles as r', 'u.rol_id', 'r.id')
      .select('u.id', 'u.nombre', 'u.email', 'u.username', 'u.activo', 'u.created_at', 'r.nombre as rol')
      .orderBy('u.nombre');
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function detalle(req, res) {
  try {
    const u = await db('usuarios as u')
      .join('roles as r', 'u.rol_id', 'r.id')
      .select('u.id', 'u.nombre', 'u.email', 'u.username', 'u.activo', 'u.rol_id', 'r.nombre as rol')
      .where('u.id', req.params.id)
      .first();
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function crear(req, res) {
  const { nombre, email, username, password, rol_id } = req.body;
  if (!nombre || !username || !password || !rol_id)
    return res.status(400).json({ error: 'nombre, username, password y rol_id son requeridos' });

  try {
    const existe = await db('usuarios').where('username', username).first();
    if (existe) return res.status(409).json({ error: 'El username ya existe' });

    const password_hash = await bcrypt.hash(password, 10);
    const [id] = await db('usuarios').insert({ nombre, email, username, password_hash, rol_id, activo: true });
    const nuevo = await db('usuarios as u')
      .join('roles as r', 'u.rol_id', 'r.id')
      .select('u.id', 'u.nombre', 'u.email', 'u.username', 'u.activo', 'u.rol_id', 'r.nombre as rol')
      .where('u.id', id)
      .first();
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function editar(req, res) {
  const { nombre, email, rol_id, activo } = req.body;
  try {
    const u = await db('usuarios').where('id', req.params.id).first();
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (email !== undefined) updates.email = email;
    if (rol_id !== undefined) updates.rol_id = rol_id;
    if (activo !== undefined) updates.activo = activo;

    await db('usuarios').where('id', req.params.id).update(updates);
    const actualizado = await db('usuarios as u')
      .join('roles as r', 'u.rol_id', 'r.id')
      .select('u.id', 'u.nombre', 'u.email', 'u.username', 'u.activo', 'u.rol_id', 'r.nombre as rol')
      .where('u.id', req.params.id)
      .first();
    res.json(actualizado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function cambiarPassword(req, res) {
  const { password_actual, password_nuevo } = req.body;
  const esAdmin = req.user.rol === 'Administrador' || req.user.permisos?.all;

  try {
    const u = await db('usuarios').where('id', req.params.id).first();
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Admin puede cambiar sin verificar password actual; el propio usuario debe confirmarlo
    if (!esAdmin || req.user.id === parseInt(req.params.id)) {
      if (!password_actual) return res.status(400).json({ error: 'Se requiere password actual' });
      const valido = await bcrypt.compare(password_actual, u.password_hash);
      if (!valido) return res.status(401).json({ error: 'Password actual incorrecto' });
    }

    if (!password_nuevo || password_nuevo.length < 6)
      return res.status(400).json({ error: 'El nuevo password debe tener al menos 6 caracteres' });

    const password_hash = await bcrypt.hash(password_nuevo, 10);
    await db('usuarios').where('id', req.params.id).update({ password_hash });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listarRoles(req, res) {
  try {
    const roles = await db('roles').select('id', 'nombre', 'permisos').orderBy('nombre');
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listar, detalle, crear, editar, cambiarPassword, listarRoles };

