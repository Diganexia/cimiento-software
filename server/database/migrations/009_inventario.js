exports.up = async function (knex) {
  await knex.schema.createTable('inventarios', (t) => {
    t.increments('id').primary();
    t.integer('deposito_id').notNullable().references('id').inTable('depositos').onDelete('RESTRICT');
    t.integer('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('RESTRICT');
    t.enu('estado', ['abierto', 'confirmado', 'cancelado']).notNullable().defaultTo('abierto');
    t.text('observaciones');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('inventarios_items', (t) => {
    t.increments('id').primary();
    t.integer('inventario_id').notNullable().references('id').inTable('inventarios').onDelete('CASCADE');
    t.integer('producto_id').notNullable().references('id').inTable('productos').onDelete('RESTRICT');
    t.decimal('cantidad_sistema', 14, 3).notNullable();
    t.decimal('cantidad_contada', 14, 3);
    t.decimal('diferencia', 14, 3);
    t.unique(['inventario_id', 'producto_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('inventarios_items');
  await knex.schema.dropTableIfExists('inventarios');
};
