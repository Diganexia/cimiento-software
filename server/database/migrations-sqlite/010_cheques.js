exports.up = async function (knex) {
  await knex.schema.createTable('cheques', (t) => {
    t.increments('id').primary();
    t.string('numero', 50).notNullable();
    t.string('banco', 200);
    t.string('emisor', 200);
    t.date('fecha_emision');
    t.date('fecha_acreditacion').notNullable();
    t.decimal('monto', 14, 2).notNullable();
    t.enu('estado', ['cartera', 'depositado', 'rechazado', 'endosado']).notNullable().defaultTo('cartera');
    t.text('observaciones');
    t.integer('cliente_id').references('id').inTable('clientes').onDelete('SET NULL');
    t.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('RESTRICT');
    t.timestamps(true, true);
  });

  await knex.schema.alterTable('movimientos_caja', (t) => {
    t.integer('cheque_id').references('id').inTable('cheques').onDelete('SET NULL');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('movimientos_caja', (t) => {
    t.dropColumn('cheque_id');
  });
  await knex.schema.dropTableIfExists('cheques');
};
