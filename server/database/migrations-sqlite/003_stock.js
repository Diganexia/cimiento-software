exports.up = async function (knex) {
  await knex.schema.createTable('depositos', (t) => {
    t.increments('id').primary();
    t.string('nombre', 200).notNullable();
    t.text('descripcion');
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('stock_por_deposito', (t) => {
    t.increments('id').primary();
    t.integer('producto_id').notNullable().references('id').inTable('productos').onDelete('CASCADE');
    t.integer('deposito_id').notNullable().references('id').inTable('depositos').onDelete('CASCADE');
    t.decimal('cantidad', 14, 3).notNullable().defaultTo(0);
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.unique(['producto_id', 'deposito_id']);
  });

  await knex.schema.createTable('movimientos_stock', (t) => {
    t.increments('id').primary();
    t.integer('producto_id').notNullable().references('id').inTable('productos').onDelete('RESTRICT');
    t.integer('deposito_origen_id').references('id').inTable('depositos').onDelete('RESTRICT');
    t.integer('deposito_destino_id').references('id').inTable('depositos').onDelete('RESTRICT');
    // En SQLite los enums son text + check. TRANSFERENCIA incluido desde el inicio (016 es no-op).
    t.enu('tipo', [
      'ENTRADA_COMPRA',
      'SALIDA_VENTA',
      'TRANSFERENCIA_ENTRADA',
      'TRANSFERENCIA_SALIDA',
      'TRANSFERENCIA',
      'AJUSTE_POSITIVO',
      'AJUSTE_NEGATIVO',
      'INVENTARIO'
    ]).notNullable();
    t.decimal('cantidad', 14, 3).notNullable();
    t.decimal('cantidad_anterior', 14, 3).notNullable();
    t.decimal('cantidad_posterior', 14, 3).notNullable();
    t.integer('referencia_id');
    t.string('referencia_tipo', 50);
    t.text('motivo');
    t.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('RESTRICT');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('movimientos_stock');
  await knex.schema.dropTableIfExists('stock_por_deposito');
  await knex.schema.dropTableIfExists('depositos');
};
