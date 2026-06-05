exports.up = async function (knex) {
  await knex.schema.createTable('facturas', (t) => {
    t.increments('id').primary();
    t.integer('numero').notNullable().unique();
    t.integer('cliente_id').references('id').inTable('clientes').onDelete('SET NULL');
    t.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('RESTRICT');
    t.integer('punto_venta_id').references('id').inTable('puntos_venta_afip').onDelete('SET NULL');
    t.enu('tipo', ['factura_a', 'factura_b', 'nota_debito_a', 'nota_debito_b', 'nota_credito_a', 'nota_credito_b']).notNullable();
    t.enu('estado', ['borrador', 'emitida', 'error']).notNullable().defaultTo('borrador');
    t.date('fecha').notNullable();
    t.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
    t.decimal('total', 12, 2).notNullable().defaultTo(0);
    t.string('cae', 20);
    t.date('cae_vencimiento');
    t.integer('factura_referencia_id').references('id').inTable('facturas').onDelete('SET NULL');
    t.text('observaciones');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('factura_items', (t) => {
    t.increments('id').primary();
    t.integer('factura_id').notNullable().references('id').inTable('facturas').onDelete('CASCADE');
    t.string('descripcion', 300).notNullable();
    t.decimal('cantidad', 12, 4).notNullable();
    t.decimal('precio_unitario', 12, 4).notNullable();
    t.decimal('subtotal', 12, 4).notNullable();
    t.integer('producto_id').references('id').inTable('productos').onDelete('SET NULL');
    t.integer('venta_id').references('id').inTable('ventas').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('factura_ventas', (t) => {
    t.increments('id').primary();
    t.integer('factura_id').notNullable().references('id').inTable('facturas').onDelete('CASCADE');
    t.integer('venta_id').notNullable().references('id').inTable('ventas').onDelete('RESTRICT').unique();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('factura_ventas');
  await knex.schema.dropTableIfExists('factura_items');
  await knex.schema.dropTableIfExists('facturas');
};
