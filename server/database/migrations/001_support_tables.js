exports.up = async function (knex) {
  await knex.schema.createTable('roles', (t) => {
    t.increments('id').primary();
    t.string('nombre', 100).notNullable().unique();
    t.jsonb('permisos').notNullable().defaultTo('{}');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('usuarios', (t) => {
    t.increments('id').primary();
    t.string('nombre', 200).notNullable();
    t.string('email', 200).unique();
    t.string('username', 100).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.integer('rol_id').notNullable().references('id').inTable('roles').onDelete('RESTRICT');
    t.boolean('activo').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('unidades_medida', (t) => {
    t.increments('id').primary();
    t.string('nombre', 100).notNullable();
    t.string('abreviatura', 20).notNullable();
    t.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('unidades_medida');
  await knex.schema.dropTableIfExists('usuarios');
  await knex.schema.dropTableIfExists('roles');
};
