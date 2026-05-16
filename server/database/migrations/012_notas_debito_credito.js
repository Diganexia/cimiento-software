// Extiende el check constraint de ventas.tipo_comprobante para soportar
// notas de débito y crédito A/B (tipos AFIP 2, 3, 7, 8).
exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE ventas
      DROP CONSTRAINT IF EXISTS ventas_tipo_comprobante_check,
      ADD CONSTRAINT ventas_tipo_comprobante_check
        CHECK (tipo_comprobante IN (
          'remito', 'factura_interna',
          'factura_a', 'factura_b',
          'nota_debito_a', 'nota_debito_b',
          'nota_credito_a', 'nota_credito_b'
        ))
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE ventas
      DROP CONSTRAINT IF EXISTS ventas_tipo_comprobante_check,
      ADD CONSTRAINT ventas_tipo_comprobante_check
        CHECK (tipo_comprobante IN (
          'remito', 'factura_interna',
          'factura_a', 'factura_b'
        ))
  `);
};
