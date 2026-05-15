const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  await knex('usuarios').del();

  const adminRol = await knex('roles').where('nombre', 'Administrador').first();
  const hash = await bcrypt.hash('admin1234', 10);

  await knex('usuarios').insert({
    nombre: 'Administrador',
    email: 'admin@ferreteria.local',
    username: 'admin',
    password_hash: hash,
    rol_id: adminRol.id,
    activo: true
  });
};
