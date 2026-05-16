const db = require('../config/db');
const { upsertStock, registrarMovimiento } = require('../helpers/stockHelper');

async function getSaldoProveedor(proveedor_id, trx = db) {
  const last = await trx('cuenta_corriente_proveedores')
    .where('proveedor_id', proveedor_id)
    .orderBy('id', 'desc')
    .first();
  return last ? parseFloat(last.saldo_posterior) : 0;
}

async function calcularTotales(items) {
  const subtotal = items.reduce((acc, i) => acc + parseFloat(i.subtotal || i.cantidad * i.precio_unitario), 0);
  return { subtotal, total: subtotal };
}

const listar = async (req, res) => {
  try {
    const { proveedor_id, estado, desde, hasta, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);

    const applyFilters = (b) => {
      if (proveedor_id) b.where('c.proveedor_id', proveedor_id);
      if (estado) b.where('c.estado', estado);
      if (desde) b.where('c.created_at', '>=', desde);
      if (hasta) b.where('c.created_at', '<=', hasta + ' 23:59:59');
    };

    const [{ total }] = await db('compras as c').modify(applyFilters).count('c.id as total');

    const data = await db('compras as c')
      .join('proveedores as p', 'c.proveedor_id', 'p.id')
      .join('depositos as d', 'c.deposito_destino_id', 'd.id')
      .join('usuarios as u', 'c.usuario_id', 'u.id')
      .select(
        'c.id', 'c.numero_remito', 'c.fecha_comprobante', 'c.estado',
        'c.subtotal', 'c.total', 'c.observaciones', 'c.created_at',
        'p.id as proveedor_id', 'p.nombre as proveedor',
        'd.nombre as deposito',
        'u.nombre as usuario'
      )
      .modify(applyFilters)
      .orderBy('c.created_at', 'desc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    res.json({ data, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener compras' });
  }
};

const detalle = async (req, res) => {
  try {
    const compra = await db('compras as c')
      .join('proveedores as p', 'c.proveedor_id', 'p.id')
      .join('depositos as d', 'c.deposito_destino_id', 'd.id')
      .join('usuarios as u', 'c.usuario_id', 'u.id')
      .select('c.*', 'p.nombre as proveedor', 'd.nombre as deposito', 'u.nombre as usuario')
      .where('c.id', req.params.id)
      .first();

    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });

    const items = await db('compras_items as ci')
      .join('productos as pr', 'ci.producto_id', 'pr.id')
      .leftJoin('unidades_medida as um', 'pr.unidad_medida_id', 'um.id')
      .select('ci.*', 'pr.nombre as producto', 'pr.codigo', 'um.abreviatura as unidad')
      .where('ci.compra_id', compra.id)
      .orderBy('pr.nombre');

    res.json({ ...compra, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener compra' });
  }
};

const crear = async (req, res) => {
  const { proveedor_id, deposito_destino_id, numero_remito, fecha_comprobante, observaciones, items = [], confirmar = false } = req.body;

  if (!proveedor_id || !deposito_destino_id) {
    return res.status(400).json({ error: 'Proveedor y depósito son requeridos' });
  }
  if (!items.length) {
    return res.status(400).json({ error: 'La compra debe tener al menos un ítem' });
  }

  const trx = await db.transaction();
  try {
    const itemsConSubtotal = items.map((i) => ({
      ...i,
      precio_unitario: parseFloat(i.precio_unitario),
      cantidad: parseFloat(i.cantidad),
      subtotal: parseFloat(i.cantidad) * parseFloat(i.precio_unitario)
    }));
    const { subtotal, total } = await calcularTotales(itemsConSubtotal);

    const [{ id }] = await trx('compras').insert({
      proveedor_id,
      usuario_id: req.user.id,
      deposito_destino_id,
      numero_remito: numero_remito || null,
      fecha_comprobante: fecha_comprobante || null,
      estado: 'borrador',
      subtotal,
      total,
      observaciones: observaciones || null
    }).returning('id');

    await trx('compras_items').insert(
      itemsConSubtotal.map((i) => ({
        compra_id: id,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal: i.subtotal
      }))
    );

    if (confirmar) {
      await _confirmar(id, req.user.id, trx);
    }

    await trx.commit();
    res.status(201).json({ id, estado: confirmar ? 'confirmada' : 'borrador' });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al crear compra' });
  }
};

const editar = async (req, res) => {
  const { numero_remito, fecha_comprobante, observaciones, items } = req.body;

  const trx = await db.transaction();
  try {
    const compra = await trx('compras').where('id', req.params.id).first();
    if (!compra) { await trx.rollback(); return res.status(404).json({ error: 'Compra no encontrada' }); }
    if (compra.estado !== 'borrador') { await trx.rollback(); return res.status(400).json({ error: 'Solo se pueden editar compras en borrador' }); }

    const updates = {};
    if (numero_remito !== undefined) updates.numero_remito = numero_remito || null;
    if (fecha_comprobante !== undefined) updates.fecha_comprobante = fecha_comprobante || null;
    if (observaciones !== undefined) updates.observaciones = observaciones || null;

    if (items && items.length) {
      const itemsConSubtotal = items.map((i) => ({
        ...i,
        precio_unitario: parseFloat(i.precio_unitario),
        cantidad: parseFloat(i.cantidad),
        subtotal: parseFloat(i.cantidad) * parseFloat(i.precio_unitario)
      }));
      const { subtotal, total } = await calcularTotales(itemsConSubtotal);
      updates.subtotal = subtotal;
      updates.total = total;
      updates.updated_at = db.fn.now();

      await trx('compras_items').where('compra_id', compra.id).delete();
      await trx('compras_items').insert(
        itemsConSubtotal.map((i) => ({
          compra_id: compra.id,
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal
        }))
      );
    }

    if (Object.keys(updates).length) {
      await trx('compras').where('id', compra.id).update(updates);
    }

    await trx.commit();
    res.json({ ok: true });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al editar compra' });
  }
};

async function _confirmar(compra_id, usuario_id, trx) {
  const compra = await trx('compras').where('id', compra_id).first();
  if (compra.estado === 'confirmada') return;

  const items = await trx('compras_items').where('compra_id', compra_id);

  for (const item of items) {
    const stockActual = await trx('stock_por_deposito')
      .where({ producto_id: item.producto_id, deposito_id: compra.deposito_destino_id })
      .first()
      .then((r) => (r ? parseFloat(r.cantidad) : 0));

    await upsertStock(item.producto_id, compra.deposito_destino_id, parseFloat(item.cantidad), trx);

    await registrarMovimiento({
      producto_id: item.producto_id,
      deposito_destino_id: compra.deposito_destino_id,
      tipo: 'ENTRADA_COMPRA',
      cantidad: parseFloat(item.cantidad),
      cantidad_anterior: stockActual,
      cantidad_posterior: stockActual + parseFloat(item.cantidad),
      referencia_id: compra_id,
      referencia_tipo: 'compra',
      usuario_id
    }, trx);
  }

  const saldoAnterior = await getSaldoProveedor(compra.proveedor_id, trx);
  await trx('cuenta_corriente_proveedores').insert({
    proveedor_id: compra.proveedor_id,
    compra_id,
    tipo: 'debito',
    monto: parseFloat(compra.total),
    saldo_anterior: saldoAnterior,
    saldo_posterior: saldoAnterior + parseFloat(compra.total),
    descripcion: `Compra #${compra_id}${compra.numero_remito ? ` — Remito ${compra.numero_remito}` : ''}`,
    usuario_id
  });

  await trx('compras').where('id', compra_id).update({ estado: 'confirmada', updated_at: trx.fn.now() });
}

const confirmarCompra = async (req, res) => {
  const trx = await db.transaction();
  try {
    const compra = await trx('compras').where('id', req.params.id).first();
    if (!compra) { await trx.rollback(); return res.status(404).json({ error: 'Compra no encontrada' }); }
    if (compra.estado !== 'borrador') { await trx.rollback(); return res.status(400).json({ error: 'La compra ya fue confirmada o anulada' }); }

    await _confirmar(compra.id, req.user.id, trx);
    await trx.commit();
    res.json({ ok: true });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al confirmar compra' });
  }
};

module.exports = { listar, detalle, crear, editar, confirmarCompra };
