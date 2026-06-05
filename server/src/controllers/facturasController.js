const db = require('../config/db');
const afipService = require('../services/afipService');
const { generarFacturaPDF } = require('../services/pdfService');

const TIPO_LABEL = {
  factura_a: 'Factura A', factura_b: 'Factura B',
  nota_debito_a: 'Nota Débito A', nota_debito_b: 'Nota Débito B',
  nota_credito_a: 'Nota Crédito A', nota_credito_b: 'Nota Crédito B'
};

const REQUIERE_ARCA = new Set(['factura_a', 'factura_b', 'nota_debito_a', 'nota_debito_b', 'nota_credito_a', 'nota_credito_b']);

const listar = async (req, res) => {
  try {
    const { cliente_id, tipo, estado, desde, hasta, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);

    const applyFilters = (b) => {
      if (cliente_id) b.where('f.cliente_id', cliente_id);
      if (tipo) b.where('f.tipo', tipo);
      if (estado) b.where('f.estado', estado);
      if (desde) b.where('f.fecha', '>=', desde);
      if (hasta) b.where('f.fecha', '<=', hasta);
    };

    const [{ total }] = await db('facturas as f').modify(applyFilters).count('f.id as total');

    const data = await db('facturas as f')
      .leftJoin('clientes as c', 'f.cliente_id', 'c.id')
      .join('usuarios as u', 'f.usuario_id', 'u.id')
      .leftJoin('puntos_venta_afip as pv', 'f.punto_venta_id', 'pv.id')
      .select(
        'f.id', 'f.numero', 'f.tipo', 'f.estado', 'f.fecha',
        'f.subtotal', 'f.total', 'f.cae', 'f.cae_vencimiento', 'f.created_at',
        'c.nombre as cliente', 'c.cuit as cliente_cuit',
        'u.nombre as usuario',
        'pv.nombre as punto_venta', 'pv.numero as punto_venta_numero'
      )
      .modify(applyFilters)
      .orderBy('f.created_at', 'desc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    res.json({ data, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
};

const detalle = async (req, res) => {
  try {
    const factura = await db('facturas as f')
      .leftJoin('clientes as c', 'f.cliente_id', 'c.id')
      .join('usuarios as u', 'f.usuario_id', 'u.id')
      .leftJoin('puntos_venta_afip as pv', 'f.punto_venta_id', 'pv.id')
      .leftJoin('facturas as fref', 'f.factura_referencia_id', 'fref.id')
      .select(
        'f.*',
        'c.nombre as cliente_nombre', 'c.cuit as cliente_cuit', 'c.dni as cliente_dni',
        'c.tipo_iva', 'c.direccion as cliente_direccion',
        'u.nombre as usuario',
        'pv.nombre as punto_venta_nombre', 'pv.numero as punto_venta_numero',
        'fref.numero as referencia_numero', 'fref.tipo as referencia_tipo'
      )
      .where('f.id', req.params.id)
      .first();

    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    const items = await db('factura_items as fi')
      .leftJoin('ventas as v', 'fi.venta_id', 'v.id')
      .select('fi.*', 'v.numero as venta_numero')
      .where('fi.factura_id', factura.id)
      .orderBy('fi.id');

    const ventasCubiertas = await db('factura_ventas as fv')
      .join('ventas as v', 'fv.venta_id', 'v.id')
      .select('v.id', 'v.numero', 'v.total', 'v.created_at', 'v.tipo_comprobante')
      .where('fv.factura_id', factura.id);

    res.json({ ...factura, items, ventas_cubiertas: ventasCubiertas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener factura' });
  }
};

const crear = async (req, res) => {
  const {
    cliente_id,
    tipo,
    punto_venta_id,
    venta_ids = [],
    items_manuales = [],
    factura_referencia_id,
    observaciones
  } = req.body;

  if (!tipo || !REQUIERE_ARCA.has(tipo)) return res.status(400).json({ error: 'Tipo de comprobante inválido' });
  if (!venta_ids.length && !items_manuales.length) return res.status(400).json({ error: 'La factura debe tener al menos un ítem o nota de venta' });

  const trx = await db.transaction();
  try {
    // Verificar que ninguna venta ya esté facturada
    if (venta_ids.length) {
      const yaFacturadas = await trx('factura_ventas').whereIn('venta_id', venta_ids).select('venta_id');
      if (yaFacturadas.length) {
        await trx.rollback();
        return res.status(400).json({ error: `La/s nota/s de venta ${yaFacturadas.map(r => r.venta_id).join(', ')} ya están facturadas` });
      }
    }

    // Número de factura: MAX+1 con advisory lock en PG
    if (process.env.CIMIENTO_DB !== 'sqlite') {
      await trx.raw('SELECT pg_advisory_xact_lock(2)');
    }
    const { maxnum } = await trx('facturas').max('numero as maxnum').first();
    const numero = (parseInt(maxnum) || 0) + 1;

    const hoy = new Date().toISOString().slice(0, 10);

    // Recopilar ítems desde las ventas seleccionadas
    const itemsDeVentas = [];
    if (venta_ids.length) {
      const ventasItems = await trx('ventas_items as vi')
        .join('ventas as v', 'vi.venta_id', 'v.id')
        .leftJoin('productos as p', 'vi.producto_id', 'p.id')
        .select('vi.*', 'p.nombre as producto_nombre', 'v.numero as venta_numero')
        .whereIn('vi.venta_id', venta_ids)
        .orderBy('vi.venta_id').orderBy('vi.id');

      for (const vi of ventasItems) {
        itemsDeVentas.push({
          descripcion: vi.producto_nombre || 'Producto',
          cantidad: parseFloat(vi.cantidad),
          precio_unitario: parseFloat(vi.precio_unitario),
          subtotal: parseFloat(vi.subtotal),
          producto_id: vi.producto_id || null,
          venta_id: vi.venta_id
        });
      }
    }

    // Calcular totales
    const allItems = [
      ...itemsDeVentas,
      ...items_manuales.map((i) => ({
        descripcion: i.descripcion,
        cantidad: parseFloat(i.cantidad),
        precio_unitario: parseFloat(i.precio_unitario),
        subtotal: parseFloat(i.cantidad) * parseFloat(i.precio_unitario),
        producto_id: null,
        venta_id: null
      }))
    ];

    const subtotal = allItems.reduce((acc, i) => acc + i.subtotal, 0);
    const total = subtotal;

    const [{ id }] = await trx('facturas').insert({
      numero,
      cliente_id: cliente_id || null,
      usuario_id: req.user.id,
      punto_venta_id: punto_venta_id || null,
      tipo,
      estado: 'borrador',
      fecha: hoy,
      subtotal,
      total,
      factura_referencia_id: factura_referencia_id || null,
      observaciones: observaciones || null
    }).returning('id');

    // Insertar ítems
    if (allItems.length) {
      await trx('factura_items').insert(
        allItems.map((i) => ({
          factura_id: id,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal,
          producto_id: i.producto_id,
          venta_id: i.venta_id
        }))
      );
    }

    // Vincular ventas
    if (venta_ids.length) {
      await trx('factura_ventas').insert(
        venta_ids.map((vid) => ({ factura_id: id, venta_id: vid }))
      );
    }

    await trx.commit();
    res.status(201).json({ id, numero, estado: 'borrador' });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Error al crear factura' });
  }
};

const emitir = async (req, res) => {
  const trx = await db.transaction();
  try {
    const factura = await trx('facturas as f')
      .leftJoin('clientes as c', 'f.cliente_id', 'c.id')
      .leftJoin('puntos_venta_afip as pv', 'f.punto_venta_id', 'pv.id')
      .select('f.*', 'c.nombre as cliente_nombre', 'c.cuit as cliente_cuit', 'c.dni as cliente_dni', 'pv.numero as punto_venta_numero')
      .where('f.id', req.params.id)
      .first();

    if (!factura) { await trx.rollback(); return res.status(404).json({ error: 'Factura no encontrada' }); }
    if (factura.estado === 'emitida') { await trx.rollback(); return res.status(400).json({ error: 'La factura ya fue emitida' }); }
    if (!factura.punto_venta_id) { await trx.rollback(); return res.status(400).json({ error: 'La factura no tiene punto de venta ARCA asignado' }); }

    const items = await trx('factura_items').where('factura_id', factura.id).select();

    const cliente = factura.cliente_id
      ? { nombre: factura.cliente_nombre, cuit: factura.cliente_cuit, dni: factura.cliente_dni }
      : null;

    let arcaResult;
    try {
      arcaResult = await afipService.emitirFactura({
        venta: { tipo_comprobante: factura.tipo, total: factura.total },
        items,
        cliente,
        puntoVenta: factura.punto_venta_numero
      });
    } catch (arcaErr) {
      await trx('facturas').where('id', factura.id).update({ estado: 'error', updated_at: trx.fn.now() });
      await trx.commit();
      return res.status(422).json({ error: arcaErr.message, estado: 'error' });
    }

    await trx('facturas').where('id', factura.id).update({
      estado: 'emitida',
      cae: arcaResult.cae,
      cae_vencimiento: arcaResult.cae_vencimiento,
      updated_at: trx.fn.now()
    });

    await trx.commit();
    res.json({ ok: true, cae: arcaResult.cae, cae_vencimiento: arcaResult.cae_vencimiento, numero: arcaResult.numero });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Error al emitir factura' });
  }
};

const ventasDisponibles = async (req, res) => {
  try {
    const { cliente_id, desde, hasta } = req.query;

    let query = db('ventas as v')
      .leftJoin('clientes as c', 'v.cliente_id', 'c.id')
      .leftJoin('factura_ventas as fv', 'v.id', 'fv.venta_id')
      .whereNull('fv.venta_id')
      .where('v.estado', 'confirmada')
      .whereIn('v.tipo_comprobante', ['remito', 'factura_interna'])
      .select('v.id', 'v.numero', 'v.total', 'v.created_at', 'v.tipo_comprobante', 'c.nombre as cliente');

    if (cliente_id) query = query.where('v.cliente_id', cliente_id);
    if (desde) query = query.where('v.created_at', '>=', desde);
    if (hasta) query = query.where('v.created_at', '<=', hasta + ' 23:59:59');

    const ventas = await query.orderBy('v.created_at', 'desc').limit(200);

    // Adjuntar ítems a cada venta
    if (ventas.length) {
      const ids = ventas.map((v) => v.id);
      const items = await db('ventas_items as vi')
        .join('productos as p', 'vi.producto_id', 'p.id')
        .leftJoin('unidades_medida as um', 'p.unidad_medida_id', 'um.id')
        .select('vi.venta_id', 'vi.id', 'vi.producto_id', 'vi.cantidad', 'vi.precio_unitario', 'vi.subtotal', 'p.nombre as descripcion', 'um.abreviatura as unidad')
        .whereIn('vi.venta_id', ids);

      const itemsMap = {};
      for (const item of items) {
        if (!itemsMap[item.venta_id]) itemsMap[item.venta_id] = [];
        itemsMap[item.venta_id].push(item);
      }
      for (const v of ventas) v.items = itemsMap[v.id] || [];
    }

    res.json(ventas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener notas de venta disponibles' });
  }
};

const pdf = async (req, res) => {
  try {
    const factura = await db('facturas as f')
      .leftJoin('clientes as c', 'f.cliente_id', 'c.id')
      .join('usuarios as u', 'f.usuario_id', 'u.id')
      .leftJoin('puntos_venta_afip as pv', 'f.punto_venta_id', 'pv.id')
      .select('f.*', 'c.nombre as cliente_nombre', 'c.cuit as cliente_cuit', 'c.dni as cliente_dni',
        'c.tipo_iva', 'c.direccion as cliente_direccion', 'u.nombre as usuario',
        'pv.numero as punto_venta_numero')
      .where('f.id', req.params.id)
      .first();

    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    const items = await db('factura_items as fi')
      .leftJoin('ventas as v', 'fi.venta_id', 'v.id')
      .select('fi.*', 'v.numero as venta_numero')
      .where('fi.factura_id', factura.id)
      .orderBy('fi.id');

    generarFacturaPDF(factura, items, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

module.exports = { listar, detalle, crear, emitir, ventasDisponibles, pdf };
