exports.up = async function (knex) {
  await knex.schema.alterTable('ventas', (t) => {
    t.decimal('redondeo_monto', 12, 2).notNullable().defaultTo(0);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('ventas', (t) => {
    t.dropColumn('redondeo_monto');
  });
};
