exports.up = async function (knex) {
  await knex.schema.createTable('retenciones', (t) => {
    t.increments('id').primary();
    t.enu('tipo', ['ganancias', 'iva', 'iibb', 'suss', 'otro']).notNullable();
    t.string('descripcion', 200);
    t.decimal('porcentaje', 5, 2);
    t.decimal('monto', 14, 2).notNullable();
    // referencia al movimiento en cuenta corriente (cobro o pago)
    t.integer('cuenta_corriente_cliente_id').references('id').inTable('cuenta_corriente_clientes').onDelete('CASCADE');
    t.integer('cuenta_corriente_proveedor_id').references('id').inTable('cuenta_corriente_proveedores').onDelete('CASCADE');
    t.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('RESTRICT');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('retenciones');
};
