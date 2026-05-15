module.exports = (modulo, accion) => (req, res, next) => {
  const permisos = req.user?.permisos;
  if (!permisos) return res.status(403).json({ error: 'Sin permisos' });
  if (permisos.all) return next();
  if (permisos[modulo]?.[accion]) return next();
  return res.status(403).json({ error: 'Permiso denegado' });
};
