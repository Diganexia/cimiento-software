exports.up = async function (knex) {
  await knex.schema.createTable('puntos_venta_afip', (t) => {
    t.increments('id').primary();
    t.integer('numero').notNullable().unique();
    t.string('nombre', 200).notNullable();
    t.enu('tipo', ['electronica', 'manual']).notNullable().defaultTo('electronica');
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('comprobantes_afip', (t) => {
    t.increments('id').primary();
    t.integer('venta_id').notNullable().references('id').inTable('ventas').onDelete('RESTRICT');
    t.integer('punto_venta_id').notNullable().references('id').inTable('puntos_venta_afip').onDelete('RESTRICT');
    t.string('tipo_comprobante', 10).notNullable();
    t.integer('numero').notNullable();
    t.string('cae', 50);
    t.date('cae_vencimiento');
    t.enu('estado', ['pendiente', 'emitido', 'error']).notNullable().defaultTo('pendiente');
    t.json('respuesta_afip');
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('comprobantes_afip');
  await knex.schema.dropTableIfExists('puntos_venta_afip');
};
