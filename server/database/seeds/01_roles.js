const PERMISOS = require('../../src/config/permissions');

exports.seed = async function (knex) {
  await knex('roles').del();
  await knex('roles').insert([
    { nombre: 'Administrador', permisos: JSON.stringify(PERMISOS.Administrador) },
    { nombre: 'Vendedor',      permisos: JSON.stringify(PERMISOS.Vendedor) },
    { nombre: 'Cajero',        permisos: JSON.stringify(PERMISOS.Cajero) },
    { nombre: 'Depósito',      permisos: JSON.stringify(PERMISOS['Depósito']) }
  ]);
};
