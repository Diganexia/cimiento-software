// No-op en SQLite: los valores de nota_debito/credito ya están en la migración 004.
// SQLite no soporta ALTER TABLE DROP CONSTRAINT, por lo que el constraint
// original ya incluye todos los tipos necesarios desde la creación de la tabla.
exports.up = async function () {};
exports.down = async function () {};
