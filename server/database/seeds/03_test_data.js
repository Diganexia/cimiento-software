exports.seed = async function (knex) {
  // Unidades de medida
  await knex('unidades_medida').del();
  const [{ id: umUnidad }] = await knex('unidades_medida').insert([
    { nombre: 'Unidad',  abreviatura: 'u' },
    { nombre: 'Kilogramo', abreviatura: 'kg' },
    { nombre: 'Metro',   abreviatura: 'm' },
    { nombre: 'Metro cuadrado', abreviatura: 'm²' },
    { nombre: 'Litro',   abreviatura: 'L' },
    { nombre: 'Bolsa',   abreviatura: 'bsa' },
    { nombre: 'Caja',    abreviatura: 'caja' },
    { nombre: 'Rollo',   abreviatura: 'rollo' }
  ]).returning('id');

  const unidades = await knex('unidades_medida').select('id', 'abreviatura');
  const um = (abr) => unidades.find((u) => u.abreviatura === abr).id;

  // Rubros
  await knex('rubros').del();
  const [rConstruccion] = await knex('rubros').insert({ nombre: 'Materiales de construcción' }).returning('id');
  const [rFerreteria]   = await knex('rubros').insert({ nombre: 'Ferretería general' }).returning('id');
  const [rElectricidad] = await knex('rubros').insert({ nombre: 'Electricidad' }).returning('id');
  const [rPlomeria]     = await knex('rubros').insert({ nombre: 'Plomería' }).returning('id');
  const [rPinturas]     = await knex('rubros').insert({ nombre: 'Pinturas' }).returning('id');

  await knex('rubros').insert([
    { nombre: 'Hierros y aceros',   rubro_padre_id: rConstruccion.id },
    { nombre: 'Cemento y mezclas',  rubro_padre_id: rConstruccion.id },
    { nombre: 'Ladrillos y bloques',rubro_padre_id: rConstruccion.id },
    { nombre: 'Tornillos',          rubro_padre_id: rFerreteria.id },
    { nombre: 'Herramientas',       rubro_padre_id: rFerreteria.id }
  ]);

  const rubros = await knex('rubros').select('id', 'nombre');
  const rubro = (nombre) => rubros.find((r) => r.nombre === nombre).id;

  // Proveedores
  await knex('proveedores').del();
  const [pNorte] = await knex('proveedores').insert({
    nombre: 'Distribuidora Norte SA',
    razon_social: 'Distribuidora Norte SA',
    cuit: '30-61234567-9',
    telefono: '011-4567-8901',
    email: 'ventas@distrnorte.com.ar'
  }).returning('id');

  const [pSur] = await knex('proveedores').insert({
    nombre: 'Materiales del Sur SRL',
    razon_social: 'Materiales del Sur SRL',
    cuit: '30-51234567-0',
    telefono: '011-3456-7890',
    email: 'compras@matsur.com.ar'
  }).returning('id');

  // Productos (10)
  await knex('productos').del();
  await knex('productos').insert([
    { nombre: 'Barra de hierro 12mm x 12m', codigo: 'HIE-12', rubro_id: rubro('Hierros y aceros'),    unidad_medida_id: um('m'),    proveedor_habitual_id: pNorte.id, precio_costo: 2500, precio_venta: 3200, stock_minimo: 50 },
    { nombre: 'Cemento Portland 50kg',       codigo: 'CEM-50', rubro_id: rubro('Cemento y mezclas'),  unidad_medida_id: um('bsa'),  proveedor_habitual_id: pSur.id,   precio_costo: 1200, precio_venta: 1600, stock_minimo: 20 },
    { nombre: 'Tornillo M6x50 (pack x50)',   codigo: 'TOR-M6', rubro_id: rubro('Tornillos'),           unidad_medida_id: um('caja'), proveedor_habitual_id: pNorte.id, precio_costo:  350, precio_venta:  500, stock_minimo: 10 },
    { nombre: 'Caño PVC 4" x 6m',           codigo: 'PVC-4',  rubro_id: rubro('Plomería'),            unidad_medida_id: um('m'),    proveedor_habitual_id: pSur.id,   precio_costo:  800, precio_venta: 1100, stock_minimo: 30 },
    { nombre: 'Pintura látex interior 4L',   codigo: 'PIN-4L', rubro_id: rubro('Pinturas'),            unidad_medida_id: um('u'),    proveedor_habitual_id: pSur.id,   precio_costo: 3500, precio_venta: 4800, stock_minimo:  5 },
    { nombre: 'Cable unipolar 2.5mm r/100m', codigo: 'CAB-25', rubro_id: rubro('Electricidad'),        unidad_medida_id: um('rollo'),proveedor_habitual_id: pNorte.id, precio_costo: 8000, precio_venta:10500, stock_minimo:  5 },
    { nombre: 'Ladrillos comunes (x1000)',   codigo: 'LAD-1K', rubro_id: rubro('Ladrillos y bloques'), unidad_medida_id: um('u'),    proveedor_habitual_id: pNorte.id, precio_costo:45000, precio_venta:60000, stock_minimo:  2 },
    { nombre: 'Disco de corte 4.5"',         codigo: 'DIS-45', rubro_id: rubro('Herramientas'),        unidad_medida_id: um('u'),    proveedor_habitual_id: pSur.id,   precio_costo:  250, precio_venta:  380, stock_minimo: 20 },
    { nombre: 'Tubo LED 18W x 1.2m',         codigo: 'LED-18', rubro_id: rubro('Electricidad'),        unidad_medida_id: um('u'),    proveedor_habitual_id: pNorte.id, precio_costo:  600, precio_venta:  850, stock_minimo: 10 },
    { nombre: 'Aislante hidrófugo 20L',      codigo: 'AIS-20', rubro_id: rubro('Pinturas'),            unidad_medida_id: um('u'),    proveedor_habitual_id: pSur.id,   precio_costo: 2800, precio_venta: 3800, stock_minimo:  5 }
  ]);

  // Depósito inicial
  await knex('depositos').del();
  await knex('depositos').insert({ nombre: 'Depósito Principal', descripcion: 'Depósito central' });

  // Cajas
  await knex('cajas').del();
  await knex('cajas').insert({ nombre: 'Caja Principal' });

  // Medios de pago base
  await knex('medios_pago').del();
  await knex('medios_pago').insert([
    { nombre: 'Efectivo' },
    { nombre: 'Débito' },
    { nombre: 'Crédito' },
    { nombre: 'Transferencia' }
  ]);

  // Clientes
  await knex('clientes').del();
  await knex('clientes').insert([
    {
      nombre: 'Juan Pérez',
      dni: '28456789',
      telefono: '011-1234-5678',
      tipo_iva: 'consumidor_final',
      tiene_cuenta_corriente: false
    },
    {
      nombre: 'Constructora Los Pinos SRL',
      razon_social: 'Los Pinos Construcciones SRL',
      cuit: '30-71234567-8',
      email: 'admin@lospinos.com.ar',
      tipo_iva: 'responsable_inscripto',
      tiene_cuenta_corriente: true,
      limite_credito: 500000
    },
    {
      nombre: 'Miguel Torres',
      dni: '35789012',
      telefono: '011-9876-5432',
      tipo_iva: 'monotributista',
      tiene_cuenta_corriente: false
    }
  ]);
};
