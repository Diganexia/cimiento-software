exports.up = async function (knex) {
  await knex.schema.createTable('clientes', (t) => {
    t.increments('id').primary();
    t.string('nombre', 200).notNullable();
    t.string('razon_social', 200);
    t.string('cuit', 20);
    t.string('dni', 20);
    t.string('telefono', 50);
    t.string('email', 200);
    t.string('direccion', 300);
    t.enu('tipo_iva', [
      'consumidor_final',
      'responsable_inscripto',
      'monotributista',
      'exento'
    ]).notNullable().defaultTo('consumidor_final');
    t.boolean('tiene_cuenta_corriente').notNullable().defaultTo(false);
    t.decimal('limite_credito', 14, 2).notNullable().defaultTo(0);
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('ventas', (t) => {
    t.increments('id').primary();
    t.integer('numero').notNullable();
    t.integer('cliente_id').references('id').inTable('clientes').onDelete('RESTRICT');
    t.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('RESTRICT');
    t.integer('deposito_id').notNullable().references('id').inTable('depositos').onDelete('RESTRICT');
    // Incluye notas de débito/crédito desde el inicio (012 es no-op en SQLite)
    t.enu('tipo_comprobante', [
      'remito',
      'factura_interna',
      'factura_a',
      'factura_b',
      'nota_debito_a',
      'nota_debito_b',
      'nota_credito_a',
      'nota_credito_b'
    ]).notNullable().defaultTo('remito');
    t.enu('estado', ['borrador', 'confirmada', 'anulada']).notNullable().defaultTo('borrador');
    t.decimal('subtotal', 14, 2).notNullable().defaultTo(0);
    t.decimal('descuento_porcentaje', 5, 2).notNullable().defaultTo(0);
    t.decimal('descuento_monto', 14, 2).notNullable().defaultTo(0);
    t.decimal('total', 14, 2).notNullable().defaultTo(0);
    t.enu('tipo_pago', ['contado', 'cuenta_corriente', 'mixto']).notNullable().defaultTo('contado');
    t.text('observaciones');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('ventas_items', (t) => {
    t.increments('id').primary();
    t.integer('venta_id').notNullable().references('id').inTable('ventas').onDelete('CASCADE');
    t.integer('producto_id').notNullable().references('id').inTable('productos').onDelete('RESTRICT');
    t.decimal('cantidad', 14, 3).notNullable();
    t.decimal('precio_unitario', 14, 2).notNullable();
    t.decimal('descuento_porcentaje', 5, 2).notNullable().defaultTo(0);
    t.decimal('subtotal', 14, 2).notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('ventas_items');
  await knex.schema.dropTableIfExists('ventas');
  await knex.schema.dropTableIfExists('clientes');
};
