// No-op en SQLite: el valor 'TRANSFERENCIA' ya está incluido en la migración 003.
// SQLite no tiene ALTER TYPE ni bloques DO $$; el enum original ya lo contempla.
exports.up = async function () {};
exports.down = async function () {};
