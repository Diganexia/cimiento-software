const VALORES_NUEVOS = [
  'ENTRADA_COMPRA', 'SALIDA_VENTA',
  'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA',
  'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'INVENTARIO'
];

const VALORES_ORIGINALES = [
  'ENTRADA_COMPRA', 'SALIDA_VENTA',
  'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SALIDA',
  'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'INVENTARIO'
];

async function reemplazarConstraint(knex, valores) {
  // Busca y elimina cualquier CHECK constraint sobre la columna 'tipo'
  await knex.raw(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT tc.constraint_name
        FROM information_schema.constraint_column_usage ccu
        JOIN information_schema.table_constraints tc
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_name = ccu.table_name
        WHERE ccu.table_name = 'movimientos_stock'
          AND ccu.column_name = 'tipo'
          AND tc.constraint_type = 'CHECK'
      LOOP
        EXECUTE 'ALTER TABLE movimientos_stock DROP CONSTRAINT ' || quote_ident(r.constraint_name);
      END LOOP;
    END $$;
  `);

  const lista = valores.map((v) => `'${v}'`).join(',');
  await knex.raw(`
    ALTER TABLE movimientos_stock
      ADD CONSTRAINT movimientos_stock_tipo_check
      CHECK (tipo IN (${lista}));
  `);
}

exports.up = (knex) => reemplazarConstraint(knex, VALORES_NUEVOS);
exports.down = (knex) => reemplazarConstraint(knex, VALORES_ORIGINALES);
