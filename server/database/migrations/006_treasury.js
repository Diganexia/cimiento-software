exports.up = async function (knex) {
  await knex.schema.createTable('medios_pago', (t) => {
    t.increments('id').primary();
    t.string('nombre', 100).notNullable().unique();
    t.boolean('activo').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('cajas', (t) => {
    t.increments('id').primary();
    t.string('nombre', 200).notNullable();
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('arqueos', (t) => {
    t.increments('id').primary();
    t.integer('caja_id').notNullable().references('id').inTable('cajas').onDelete('RESTRICT');
    t.integer('usuario_apertura_id').notNullable().references('id').inTable('usuarios').onDelete('RESTRICT');
    t.integer('usuario_cierre_id').references('id').inTable('usuarios').onDelete('RESTRICT');
    t.decimal('saldo_inicial', 14, 2).notNullable().defaultTo(0);
    t.decimal('saldo_declarado_cierre', 14, 2);
    t.decimal('saldo_calculado_cierre', 14, 2);
    t.decimal('diferencia_cierre', 14, 2);
    t.enu('estado', ['abierto', 'cerrado']).notNullable().defaultTo('abierto');
    t.timestamp('abierto_at').defaultTo(knex.fn.now());
    t.timestamp('cerrado_at');
  });

  await knex.schema.createTable('movimientos_caja', (t) => {
    t.increments('id').primary();
    t.integer('arqueo_id').notNullable().references('id').inTable('arqueos').onDelete('RESTRICT');
    t.integer('medio_pago_id').notNullable().references('id').inTable('medios_pago').onDelete('RESTRICT');
    t.enu('tipo', ['ingreso', 'egreso']).notNullable();
    t.enu('concepto', [
      'venta',
      'cobro_cta_cte',
      'pago_proveedor',
      'gasto',
      'apertura',
      'cierre',
      'manual'
    ]).notNullable();
    t.decimal('monto', 14, 2).notNullable();
    t.integer('referencia_id');
    t.string('referencia_tipo', 50);
    t.text('descripcion');
    t.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('RESTRICT');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('movimientos_caja');
  await knex.schema.dropTableIfExists('arqueos');
  await knex.schema.dropTableIfExists('cajas');
  await knex.schema.dropTableIfExists('medios_pago');
};
