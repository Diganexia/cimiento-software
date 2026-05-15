exports.up = async function (knex) {
  await knex.schema.createTable('rubros', (t) => {
    t.increments('id').primary();
    t.string('nombre', 200).notNullable();
    t.integer('rubro_padre_id').references('id').inTable('rubros').onDelete('SET NULL');
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('proveedores', (t) => {
    t.increments('id').primary();
    t.string('nombre', 200).notNullable();
    t.string('razon_social', 200);
    t.string('cuit', 20);
    t.string('telefono', 50);
    t.string('email', 200);
    t.string('direccion', 300);
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('productos', (t) => {
    t.increments('id').primary();
    t.string('codigo', 100).unique();
    t.string('codigo_barra', 100).unique();
    t.string('nombre', 300).notNullable();
    t.text('descripcion');
    t.integer('rubro_id').references('id').inTable('rubros').onDelete('SET NULL');
    t.integer('unidad_medida_id').notNullable().references('id').inTable('unidades_medida').onDelete('RESTRICT');
    t.integer('proveedor_habitual_id').references('id').inTable('proveedores').onDelete('SET NULL');
    t.decimal('precio_costo', 14, 2).notNullable().defaultTo(0);
    t.decimal('precio_venta', 14, 2).notNullable().defaultTo(0);
    t.decimal('stock_minimo', 14, 3).notNullable().defaultTo(0);
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('productos');
  await knex.schema.dropTableIfExists('proveedores');
  await knex.schema.dropTableIfExists('rubros');
};
