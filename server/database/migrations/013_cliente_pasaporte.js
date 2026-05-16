exports.up = async function (knex) {
  await knex.schema.alterTable('clientes', (t) => {
    t.string('pasaporte', 50);
    t.enu('tipo_documento', ['cuit', 'dni', 'pasaporte']).notNullable().defaultTo('cuit');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('clientes', (t) => {
    t.dropColumn('pasaporte');
    t.dropColumn('tipo_documento');
  });
};
