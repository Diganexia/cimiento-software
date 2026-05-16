const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const login = async (req, res) => {
  const { username, password } = req.body;
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
    res.json({ token, usuario: payload });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const logout = (_req, res) => {
  res.json({ message: 'Sesión cerrada' });
};

const me = (req, res) => {
  res.json(req.user);
};

module.exports = { login, logout, me };
