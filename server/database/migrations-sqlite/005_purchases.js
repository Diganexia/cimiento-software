exports.up = async function (knex) {
  await knex.schema.createTable('compras', (t) => {
    t.increments('id').primary();
    t.integer('proveedor_id').notNullable().references('id').inTable('proveedores').onDelete('RESTRICT');
    t.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('RESTRICT');
    t.integer('deposito_destino_id').notNullable().references('id').inTable('depositos').onDelete('RESTRICT');
    t.string('numero_remito', 100);
    t.date('fecha_comprobante');
    t.enu('estado', ['borrador', 'confirmada', 'anulada']).notNullable().defaultTo('borrador');
    t.decimal('subtotal', 14, 2).notNullable().defaultTo(0);
    t.decimal('total', 14, 2).notNullable().defaultTo(0);
    t.text('observaciones');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('compras_items', (t) => {
    t.increments('id').primary();
    t.integer('compra_id').notNullable().references('id').inTable('compras').onDelete('CASCADE');
    t.integer('producto_id').notNullable().references('id').inTable('productos').onDelete('RESTRICT');
    t.decimal('cantidad', 14, 3).notNullable();
    t.decimal('precio_unitario', 14, 2).notNullable();
    t.decimal('subtotal', 14, 2).notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('compras_items');
  await knex.schema.dropTableIfExists('compras');
};
