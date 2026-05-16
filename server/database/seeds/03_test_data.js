exports.seed = async function (knex) {
  // Unidades de medida base
  await knex('unidades_medida').del();
  await knex('unidades_medida').insert([
    { nombre: 'Unidad',         abreviatura: 'u' },
    { nombre: 'Kilogramo',      abreviatura: 'kg' },
    { nombre: 'Metro',          abreviatura: 'm' },
    { nombre: 'Metro cuadrado', abreviatura: 'm²' },
    { nombre: 'Litro',          abreviatura: 'L' },
    { nombre: 'Bolsa',          abreviatura: 'bsa' },
    { nombre: 'Caja',           abreviatura: 'caja' },
    { nombre: 'Rollo',          abreviatura: 'rollo' }
  ]);

  // Depósito inicial
  await knex('depositos').del();
  await knex('depositos').insert({ nombre: 'Depósito Principal', descripcion: 'Depósito central' });

  // Caja inicial
  await knex('cajas').del();
  await knex('cajas').insert({ nombre: 'Caja Principal' });

  // Medios de pago base
  await knex('medios_pago').del();
  await knex('medios_pago').insert([
    { nombre: 'Efectivo' },
    { nombre: 'Débito' },
    { nombre: 'Crédito' },
    { nombre: 'Transferencia' },
    { nombre: 'Cheque' }
  ]);
};
