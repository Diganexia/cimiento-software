exports.up = async function (knex) {
  await knex.schema.alterTable('clientes', (t) => {
    t.string('pasaporte', 50);
    // En SQLite, alterTable + enu no genera CHECK constraint; usamos string directamente.
    t.string('tipo_documento', 20).notNullable().defaultTo('cuit');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('clientes', (t) => {
    t.dropColumn('pasaporte');
    t.dropColumn('tipo_documento');
  });
};
