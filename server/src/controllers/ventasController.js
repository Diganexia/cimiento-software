const db = require('../config/db');
const { upsertStock, registrarMovimiento, getStockDeposito } = require('../helpers/stockHelper');
const { generarVentaPDF } = require('../services/pdfService');
const afipService = require('../services/afipService');

async function getSaldoCliente(cliente_id, trx = db) {
  const last = await trx('cuenta_corriente_clientes')
    .where('cliente_id', cliente_id)
    .orderBy('id', 'desc')
    .first();
  return last ? parseFloat(last.saldo_posterior) : 0;
}

const listar = async (req, res) => {
  try {
    const { cliente_id, estado, tipo_comprobante, desde, hasta, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);

    const applyFilters = (b) => {
      if (cliente_id) b.where('v.cliente_id', cliente_id);
      if (estado) b.where('v.estado', estado);
      if (tipo_comprobante) b.where('v.tipo_comprobante', tipo_comprobante);
      if (desde) b.where('v.created_at', '>=', desde);
      if (hasta) b.where('v.created_at', '<=', hasta + ' 23:59:59');
    };

    const [{ total }] = await db('ventas as v').modify(applyFilters).count('v.id as total');

    const data = await db('ventas as v')
      .leftJoin('clientes as c', 'v.cliente_id', 'c.id')
      .join('usuarios as u', 'v.usuario_id', 'u.id')
      .join('depositos as d', 'v.deposito_id', 'd.id')
      .select(
        'v.id', 'v.numero', 'v.tipo_comprobante', 'v.estado', 'v.tipo_pago',
        'v.subtotal', 'v.descuento_monto', 'v.total', 'v.created_at',
        'c.nombre as cliente', 'u.nombre as usuario', 'd.nombre as deposito'
      )
      .modify(applyFilters)
      .orderBy('v.created_at', 'desc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    res.json({ data, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
};

const detalle = async (req, res) => {
  try {
    const venta = await db('ventas as v')
      .leftJoin('clientes as c', 'v.cliente_id', 'c.id')
      .join('usuarios as u', 'v.usuario_id', 'u.id')
      .join('depositos as d', 'v.deposito_id', 'd.id')
      .leftJoin('comprobantes_afip as ca', 'ca.venta_id', 'v.id')
      .select('v.*', 'c.nombre as cliente', 'c.cuit as cliente_cuit', 'c.dni as cliente_dni',
        'c.tipo_iva', 'c.direccion as cliente_direccion',
        'u.nombre as usuario', 'd.nombre as deposito',
        'ca.cae', 'ca.cae_vencimiento', 'ca.numero as numero_afip')
      .where('v.id', req.params.id)
      .first();

    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

    const items = await db('ventas_items as vi')
      .join('productos as p', 'vi.producto_id', 'p.id')
      .leftJoin('unidades_medida as um', 'p.unidad_medida_id', 'um.id')
      .select('vi.*', 'p.nombre as producto', 'p.codigo', 'um.abreviatura as unidad')
      .where('vi.venta_id', venta.id)
      .orderBy('p.nombre');

    res.json({ ...venta, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener venta' });
  }
};

const crear = async (req, res) => {
  const {
    cliente_id, deposito_id, tipo_comprobante = 'remito', tipo_pago = 'contado',
    items = [], descuento_porcentaje = 0, observaciones,
    confirmar = false, pagos = [], punto_venta_id,
    cuotas           // { cantidad: N, fecha_primera: 'YYYY-MM-DD' }
  } = req.body;

  if (!deposito_id) return res.status(400).json({ error: 'El depósito es requerido' });
  if (!items.length) return res.status(400).json({ error: 'La venta debe tener al menos un ítem' });

  const trx = await db.transaction();
  try {
    const { maxnum } = await trx('ventas').max('numero as maxnum').first();
    const numero = (parseInt(maxnum) || 0) + 1;

    const itemsCalc = items.map((i) => {
      const cant = parseFloat(i.cantidad);
      const precio = parseFloat(i.precio_unitario);
      const desc = parseFloat(i.descuento_porcentaje || 0);
      return { ...i, cantidad: cant, precio_unitario: precio, descuento_porcentaje: desc, subtotal: cant * precio * (1 - desc / 100) };
    });

    const subtotal = itemsCalc.reduce((acc, i) => acc + i.subtotal, 0);
    const descP = parseFloat(descuento_porcentaje || 0);
    const descM = subtotal * descP / 100;
    const total = subtotal - descM;

    const [{ id }] = await trx('ventas').insert({
      numero,
      cliente_id: cliente_id || null,
      usuario_id: req.user.id,
      deposito_id,
      tipo_comprobante,
      estado: 'borrador',
      subtotal,
      descuento_porcentaje: descP,
      descuento_monto: descM,
      total,
      tipo_pago,
      observaciones: observaciones || null
    }).returning('id');

    await trx('ventas_items').insert(
      itemsCalc.map((i) => ({
        venta_id: id,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        descuento_porcentaje: i.descuento_porcentaje,
        subtotal: i.subtotal
      }))
    );

    if (confirmar) {
      await _confirmar(id, req.user.id, pagos, punto_venta_id, cuotas, trx);
    }

    await trx.commit();
    res.status(201).json({ id, numero, estado: confirmar ? 'confirmada' : 'borrador' });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Error al crear venta' });
  }
};

const confirmarVenta = async (req, res) => {
  const trx = await db.transaction();
  try {
    const venta = await trx('ventas').where('id', req.params.id).first();
    if (!venta) { await trx.rollback(); return res.status(404).json({ error: 'Venta no encontrada' }); }
    if (venta.estado !== 'borrador') { await trx.rollback(); return res.status(400).json({ error: 'La venta ya fue procesada' }); }

    const { pagos = [], punto_venta_id, cuotas } = req.body;
    await _confirmar(venta.id, req.user.id, pagos, punto_venta_id, cuotas, trx);
    await trx.commit();
    res.json({ ok: true });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Error al confirmar venta' });
  }
};

const anular = async (req, res) => {
  const trx = await db.transaction();
  try {
    const venta = await trx('ventas').where('id', req.params.id).first();
    if (!venta) { await trx.rollback(); return res.status(404).json({ error: 'Venta no encontrada' }); }
    if (venta.estado !== 'confirmada') { await trx.rollback(); return res.status(400).json({ error: 'Solo se pueden anular ventas confirmadas' }); }

    const items = await trx('ventas_items').where('venta_id', venta.id);
    for (const item of items) {
      const stockActual = await getStockDeposito(item.producto_id, venta.deposito_id, trx);
      await upsertStock(item.producto_id, venta.deposito_id, parseFloat(item.cantidad), trx);
      await registrarMovimiento({
        producto_id: item.producto_id,
        deposito_destino_id: venta.deposito_id,
        tipo: 'AJUSTE_POSITIVO',
        cantidad: parseFloat(item.cantidad),
        cantidad_anterior: stockActual,
        cantidad_posterior: stockActual + parseFloat(item.cantidad),
        referencia_id: venta.id,
        referencia_tipo: 'anulacion_venta',
        usuario_id: req.user.id
      }, trx);
    }

    await trx('ventas').where('id', venta.id).update({ estado: 'anulada', updated_at: trx.fn.now() });
    await trx.commit();
    res.json({ ok: true });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al anular venta' });
  }
};

const pdf = async (req, res) => {
  try {
    const venta = await db('ventas as v')
      .leftJoin('clientes as c', 'v.cliente_id', 'c.id')
      .join('usuarios as u', 'v.usuario_id', 'u.id')
      .select('v.*', 'c.nombre as cliente_nombre', 'c.cuit as cliente_cuit',
        'c.dni as cliente_dni', 'c.tipo_iva', 'c.direccion as cliente_direccion', 'u.nombre as usuario')
      .where('v.id', req.params.id).first();

    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

    const items = await db('ventas_items as vi')
      .join('productos as p', 'vi.producto_id', 'p.id')
      .select('vi.*', 'p.nombre as producto', 'p.codigo')
      .where('vi.venta_id', venta.id)
      .orderBy('p.nombre');

    const comprobante = await db('comprobantes_afip').where('venta_id', venta.id).first();

    const cliente = venta.cliente_id ? {
      nombre: venta.cliente_nombre, cuit: venta.cliente_cuit,
      dni: venta.cliente_dni, tipo_iva: venta.tipo_iva, direccion: venta.cliente_direccion
    } : null;

    generarVentaPDF(venta, items, cliente, comprobante, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

async function _confirmar(venta_id, usuario_id, pagos, punto_venta_id, cuotas, trx) {
  const venta = await trx('ventas').where('id', venta_id).first();
  if (venta.estado === 'confirmada') return;

  const items = await trx('ventas_items').where('venta_id', venta_id);

  for (const item of items) {
    const stockActual = await getStockDeposito(item.producto_id, venta.deposito_id, trx);
    if (stockActual < parseFloat(item.cantidad)) {
      throw new Error(`Stock insuficiente para el producto ID ${item.producto_id}`);
    }
    await upsertStock(item.producto_id, venta.deposito_id, -parseFloat(item.cantidad), trx);
    await registrarMovimiento({
      producto_id: item.producto_id,
      deposito_origen_id: venta.deposito_id,
      tipo: 'SALIDA_VENTA',
      cantidad: parseFloat(item.cantidad),
      cantidad_anterior: stockActual,
      cantidad_posterior: stockActual - parseFloat(item.cantidad),
      referencia_id: venta_id,
      referencia_tipo: 'venta',
      usuario_id
    }, trx);
  }

  // Cash register movement
  if (venta.tipo_pago !== 'cuenta_corriente' && pagos.length) {
    const arqueo = await trx('arqueos').where('estado', 'abierto').orderBy('abierto_at', 'desc').first();
    if (arqueo) {
      for (const pago of pagos) {
        await trx('movimientos_caja').insert({
          arqueo_id: arqueo.id,
          medio_pago_id: pago.medio_pago_id,
          tipo: 'ingreso',
          concepto: 'venta',
          monto: parseFloat(pago.monto),
          referencia_id: venta_id,
          referencia_tipo: 'venta',
          descripcion: `Venta #${venta.numero}`,
          usuario_id
        });
      }
    }
  }

  // Account current
  if (venta.cliente_id && venta.tipo_pago !== 'contado') {
    const pagoCC = venta.tipo_pago === 'cuenta_corriente'
      ? parseFloat(venta.total)
      : parseFloat(venta.total) - pagos.reduce((acc, p) => acc + parseFloat(p.monto), 0);

    if (pagoCC > 0) {
      const saldoAnterior = await getSaldoCliente(venta.cliente_id, trx);
      await trx('cuenta_corriente_clientes').insert({
        cliente_id: venta.cliente_id,
        venta_id,
        tipo: 'debito',
        monto: pagoCC,
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoAnterior + pagoCC,
        descripcion: `Venta #${venta.numero}`,
        usuario_id
      });
    }
  }

  // Installments (cuotas)
  if (cuotas && cuotas.cantidad > 1 && venta.cliente_id) {
    const cantNum = parseInt(cuotas.cantidad);
    const montoPorCuota = parseFloat((parseFloat(venta.total) / cantNum).toFixed(2));
    const fechaBase = cuotas.fecha_primera ? new Date(cuotas.fecha_primera) : new Date();
    const rows = [];
    for (let i = 0; i < cantNum; i++) {
      const venc = new Date(fechaBase);
      venc.setMonth(venc.getMonth() + i);
      rows.push({
        cliente_id: venta.cliente_id,
        venta_id: venta_id,
        numero_cuota: i + 1,
        monto: montoPorCuota,
        fecha_vencimiento: venc.toISOString().split('T')[0],
        estado: 'pendiente'
      });
    }
    await trx('cuotas_cliente').insert(rows);
  }

  // AFIP electronic billing
  if ((venta.tipo_comprobante === 'factura_a' || venta.tipo_comprobante === 'factura_b') && punto_venta_id) {
    const puntoVenta = await trx('puntos_venta_afip').where('id', punto_venta_id).first();
    if (puntoVenta) {
      const cliente = venta.cliente_id ? await trx('clientes').where('id', venta.cliente_id).first() : null;
      const [{ id: cbteId }] = await trx('comprobantes_afip').insert({
        venta_id,
        punto_venta_id: puntoVenta.id,
        tipo_comprobante: venta.tipo_comprobante,
        numero: 0,
        estado: 'pendiente'
      }).returning('id');

      try {
        const resultado = await afipService.emitirFactura({
          venta: { ...venta, deposito_id: venta.deposito_id },
          items,
          cliente,
          puntoVenta: puntoVenta.numero
        });
        await trx('comprobantes_afip').where('id', cbteId).update({
          numero: resultado.numero,
          cae: resultado.cae,
          cae_vencimiento: resultado.cae_vencimiento,
          estado: 'emitido',
          respuesta_afip: JSON.stringify(resultado.respuesta),
          updated_at: trx.fn.now()
        });
      } catch (afipErr) {
        await trx('comprobantes_afip').where('id', cbteId).update({
          estado: 'error',
          respuesta_afip: JSON.stringify({ error: afipErr.message }),
          updated_at: trx.fn.now()
        });
        throw afipErr;
      }
    }
  }

  await trx('ventas').where('id', venta_id).update({ estado: 'confirmada', updated_at: trx.fn.now() });
}

module.exports = { listar, detalle, crear, confirmarVenta, anular, pdf };
