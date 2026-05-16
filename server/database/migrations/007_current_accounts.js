exports.up = async function (knex) {
  await knex.schema.createTable('cuenta_corriente_clientes', (t) => {
    t.increments('id').primary();
    t.integer('cliente_id').notNullable().references('id').inTable('clientes').onDelete('RESTRICT');
    t.integer('venta_id').references('id').inTable('ventas').onDelete('RESTRICT');
    t.enu('tipo', ['debito', 'credito']).notNullable();
    t.decimal('monto', 14, 2).notNullable();
    t.decimal('saldo_anterior', 14, 2).notNullable();
    t.decimal('saldo_posterior', 14, 2).notNullable();
    t.string('descripcion', 500).notNullable();
    t.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('RESTRICT');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('cuotas_cliente', (t) => {
    t.increments('id').primary();
    t.integer('cliente_id').notNullable().references('id').inTable('clientes').onDelete('RESTRICT');
    t.integer('venta_id').notNullable().references('id').inTable('ventas').onDelete('RESTRICT');
    t.integer('numero_cuota').notNullable();
    t.decimal('monto', 14, 2).notNullable();
    t.date('fecha_vencimiento').notNullable();
    t.enu('estado', ['pendiente', 'pagada', 'vencida']).notNullable().defaultTo('pendiente');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('cuenta_corriente_proveedores', (t) => {
    t.increments('id').primary();
    t.integer('proveedor_id').notNullable().references('id').inTable('proveedores').onDelete('RESTRICT');
    t.integer('compra_id').references('id').inTable('compras').onDelete('RESTRICT');
    t.enu('tipo', ['debito', 'credito']).notNullable();
    t.decimal('monto', 14, 2).notNullable();
    t.decimal('saldo_anterior', 14, 2).notNullable();
    t.decimal('saldo_posterior', 14, 2).notNullable();
    t.string('descripcion', 500).notNullable();
    t.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('RESTRICT');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('cuenta_corriente_proveedores');
  await knex.schema.dropTableIfExists('cuotas_cliente');
  await knex.schema.dropTableIfExists('cuenta_corriente_clientes');
};
