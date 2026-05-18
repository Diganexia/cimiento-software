exports.up = async function (knex) {
  // ALTER TYPE ADD VALUE no puede ejecutarse dentro de una transacción en PostgreSQL
  await knex.raw("ALTER TYPE movimientos_stock_tipo ADD VALUE IF NOT EXISTS 'TRANSFERENCIA'");
};

exports.down = async function (knex) {
  // PostgreSQL no permite eliminar valores de un enum
};

exports.config = { transaction: false };
