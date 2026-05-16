exports.up = async function (knex) {
  // Elimina duplicados si los hubiera (deja el de menor id)
  await knex.raw(`
    DELETE FROM ventas
    WHERE id NOT IN (
      SELECT MIN(id) FROM ventas GROUP BY numero
    )
    AND numero IN (
      SELECT numero FROM ventas GROUP BY numero HAVING COUNT(*) > 1
    )
  `);

  await knex.schema.alterTable('ventas', (t) => {
    t.unique(['numero']);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('ventas', (t) => {
    t.dropUnique(['numero']);
  });
};
