const db = require('../config/db');
const { whereIlike, orWhereIlike } = require('../lib/dbCompat');

async function getSaldoCliente(cliente_id, trx = db) {
  const last = await trx('cuenta_corriente_clientes')
    .where('cliente_id', cliente_id).orderBy('id', 'desc').first();
  return last ? parseFloat(last.saldo_posterior) : 0;
}

async function getSaldoProveedor(proveedor_id, trx = db) {
  const last = await trx('cuenta_corriente_proveedores')
    .where('proveedor_id', proveedor_id).orderBy('id', 'desc').first();
  return last ? parseFloat(last.saldo_posterior) : 0;
}

// ─── Clientes ────────────────────────────────────────────────────────────────

const resumenClientes = async (req, res) => {
  try {
    const { q, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);

    const applyFilters = (b) => {
      b.where('c.tiene_cuenta_corriente', true).where('c.activo', true);
      if (q) b.where((w) => { whereIlike(w, 'c.nombre', `%${q}%`); orWhereIlike(w, 'c.cuit', `%${q}%`); });
    };

    const [{ total }] = await db('clientes as c').modify(applyFilters).count('c.id as total');

    const clientes = await db('clientes as c')
      .modify(applyFilters)
      .select('c.id', 'c.nombre', 'c.cuit', 'c.telefono', 'c.limite_credito')
      .orderBy('c.nombre')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    const ids = clientes.map((c) => c.id);
    const saldos = ids.length
      ? await db('cuenta_corriente_clientes as ccc')
          .whereIn('ccc.cliente_id', ids)
          .select('ccc.cliente_id')
          .max('ccc.id as max_id')
          .groupBy('ccc.cliente_id')
          .then(async (rows) => {
            if (!rows.length) return {};
            const maxIds = rows.map((r) => r.max_id);
            const last = await db('cuenta_corriente_clientes').whereIn('id', maxIds).select('cliente_id', 'saldo_posterior');
            return Object.fromEntries(last.map((r) => [r.cliente_id, parseFloat(r.saldo_posterior)]));
          })
      : {};

    const data = clientes.map((c) => ({ ...c, saldo: saldos[c.id] ?? 0 }));
    res.json({ data, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener resumen de clientes' });
  }
};

const estadoCuentaCliente = async (req, res) => {
  try {
    const { desde, hasta, page = 1, limit = 100 } = req.query;
    const { clienteId } = req.params;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 500);

    const cliente = await db('clientes').where('id', clienteId).first();
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const applyFilters = (b) => {
      b.where('ccc.cliente_id', clienteId);
      if (desde) b.where('ccc.created_at', '>=', desde);
      if (hasta) b.where('ccc.created_at', '<=', hasta + ' 23:59:59');
    };

    const [{ total }] = await db('cuenta_corriente_clientes as ccc').modify(applyFilters).count('id as total');

    const movimientos = await db('cuenta_corriente_clientes as ccc')
      .leftJoin('ventas as v', 'ccc.venta_id', 'v.id')
      .join('usuarios as u', 'ccc.usuario_id', 'u.id')
      .select('ccc.*', 'v.numero as venta_numero', 'u.nombre as usuario')
      .modify(applyFilters)
      .orderBy('ccc.id', 'asc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    const saldo = await getSaldoCliente(clienteId);

    res.json({ cliente, movimientos, saldo_actual: saldo, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener estado de cuenta' });
  }
};

const cobrar = async (req, res) => {
  const { cliente_id, monto, descripcion, medio_pago_id, cheque, retenciones = [] } = req.body;
  if (!cliente_id || !monto) return res.status(400).json({ error: 'cliente_id y monto son requeridos' });

  const trx = await db.transaction();
  try {
    const saldoAnterior = await getSaldoCliente(cliente_id, trx);
    const montoNum = parseFloat(monto);

    const [{ id }] = await trx('cuenta_corriente_clientes').insert({
      cliente_id,
      tipo: 'credito',
      monto: montoNum,
      saldo_anterior: saldoAnterior,
      saldo_posterior: saldoAnterior - montoNum,
      descripcion: descripcion || 'Cobro en cuenta corriente',
      usuario_id: req.user.id
    }).returning('id');

    if (medio_pago_id) {
      const arqueo = await trx('arqueos').where('estado', 'abierto').orderBy('abierto_at', 'desc').first();
      if (arqueo) {
        let chequeId = null;
        if (cheque?.numero && cheque?.fecha_acreditacion) {
          const [{ id: cid }] = await trx('cheques').insert({
            numero: cheque.numero,
            banco: cheque.banco || null,
            emisor: cheque.emisor || null,
            fecha_emision: cheque.fecha_emision || null,
            fecha_acreditacion: cheque.fecha_acreditacion,
            monto: montoNum,
            estado: 'cartera',
            cliente_id: parseInt(cliente_id),
            usuario_id: req.user.id
          }).returning('id');
          chequeId = cid;
        }

        await trx('movimientos_caja').insert({
          arqueo_id: arqueo.id,
          medio_pago_id: parseInt(medio_pago_id),
          tipo: 'ingreso',
          concepto: 'cobro_cta_cte',
          monto: montoNum,
          referencia_id: id,
          referencia_tipo: 'cobro_cta_cte',
          descripcion: descripcion || 'Cobro cuenta corriente',
          cheque_id: chequeId,
          usuario_id: req.user.id
        });
      }
    }

    if (retenciones.length > 0) {
      const retencionRows = retenciones.map((r) => ({
        tipo: r.tipo,
        descripcion: r.descripcion || null,
        porcentaje: r.porcentaje || null,
        monto: parseFloat(r.monto),
        cuenta_corriente_cliente_id: id,
        usuario_id: req.user.id
      }));
      await trx('retenciones').insert(retencionRows);
    }

    await trx.commit();
    res.json({ ok: true, id, saldo_anterior: saldoAnterior, saldo_posterior: saldoAnterior - montoNum });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al registrar cobro' });
  }
};

const pdfCobro = async (req, res) => {
  try {
    const { id } = req.params;
    const cobro = await db('cuenta_corriente_clientes').where('id', id).first();
    if (!cobro) return res.status(404).json({ error: 'Cobro no encontrado' });

    const cliente = await db('clientes').where('id', cobro.cliente_id).first();
    const { generarReciboPDF } = require('../services/pdfService');

    let medioPago = null;
    if (cobro.medio_pago_id) {
      const mp = await db('medios_pago').where('id', cobro.medio_pago_id).first();
      if (mp) {
        medioPago = { nombre: mp.nombre };
        const movCaja = await db('movimientos_caja')
          .where('referencia_tipo', 'cobro_cta_cte')
          .where('referencia_id', cobro.id)
          .first();
        if (movCaja?.cheque_id) {
          const ch = await db('cheques').where('id', movCaja.cheque_id).first();
          if (ch) {
            medioPago.numero_cheque = ch.numero;
            medioPago.banco = ch.banco;
            medioPago.fecha_acreditacion = ch.fecha_acreditacion;
          }
        }
      }
    }

    const retenciones = await db('retenciones').where('cuenta_corriente_cliente_id', cobro.id);
    generarReciboPDF({ cobro, cliente, medioPago, retenciones }, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar recibo' });
  }
};

const pdfCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const cliente = await db('clientes').where('id', clienteId).first();
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const movimientos = await db('cuenta_corriente_clientes as ccc')
      .leftJoin('ventas as v', 'ccc.venta_id', 'v.id')
      .select('ccc.*', 'v.numero as venta_numero')
      .where('ccc.cliente_id', clienteId)
      .orderBy('ccc.id', 'asc');

    const saldo = await getSaldoCliente(clienteId);
    const { generarEstadoCuentaPDF } = require('../services/pdfService');
    generarEstadoCuentaPDF({ entidad: cliente, movimientos, saldo, tipo: 'cliente' }, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

// ─── Proveedores ─────────────────────────────────────────────────────────────

const resumenProveedores = async (req, res) => {
  try {
    const { q, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);

    const applyFilters = (b) => {
      b.where('p.activo', true);
      if (q) whereIlike(b, 'p.nombre', `%${q}%`);
    };

    const [{ total }] = await db('proveedores as p').modify(applyFilters).count('p.id as total');

    const proveedores = await db('proveedores as p')
      .modify(applyFilters)
      .select('p.id', 'p.nombre', 'p.cuit', 'p.telefono')
      .orderBy('p.nombre')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    const ids = proveedores.map((p) => p.id);
    const saldos = ids.length
      ? await db('cuenta_corriente_proveedores as ccp')
          .whereIn('ccp.proveedor_id', ids)
          .select('ccp.proveedor_id').max('ccp.id as max_id').groupBy('ccp.proveedor_id')
          .then(async (rows) => {
            if (!rows.length) return {};
            const last = await db('cuenta_corriente_proveedores').whereIn('id', rows.map((r) => r.max_id)).select('proveedor_id', 'saldo_posterior');
            return Object.fromEntries(last.map((r) => [r.proveedor_id, parseFloat(r.saldo_posterior)]));
          })
      : {};

    const data = proveedores.map((p) => ({ ...p, saldo: saldos[p.id] ?? 0 }));
    res.json({ data, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener resumen de proveedores' });
  }
};

const estadoCuentaProveedor = async (req, res) => {
  try {
    const { desde, hasta, page = 1, limit = 100 } = req.query;
    const { proveedorId } = req.params;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 500);

    const proveedor = await db('proveedores').where('id', proveedorId).first();
    if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });

    const applyFilters = (b) => {
      b.where('ccp.proveedor_id', proveedorId);
      if (desde) b.where('ccp.created_at', '>=', desde);
      if (hasta) b.where('ccp.created_at', '<=', hasta + ' 23:59:59');
    };

    const [{ total }] = await db('cuenta_corriente_proveedores as ccp').modify(applyFilters).count('id as total');

    const movimientos = await db('cuenta_corriente_proveedores as ccp')
      .leftJoin('compras as c', 'ccp.compra_id', 'c.id')
      .join('usuarios as u', 'ccp.usuario_id', 'u.id')
      .select('ccp.*', 'u.nombre as usuario')
      .modify(applyFilters)
      .orderBy('ccp.id', 'asc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    const saldo = await getSaldoProveedor(proveedorId);
    res.json({ proveedor, movimientos, saldo_actual: saldo, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener estado de cuenta' });
  }
};

const pagar = async (req, res) => {
  const { proveedor_id, monto, descripcion, medio_pago_id } = req.body;
  if (!proveedor_id || !monto) return res.status(400).json({ error: 'proveedor_id y monto son requeridos' });

  const trx = await db.transaction();
  try {
    const saldoAnterior = await getSaldoProveedor(proveedor_id, trx);
    const montoNum = parseFloat(monto);

    const [{ id }] = await trx('cuenta_corriente_proveedores').insert({
      proveedor_id,
      tipo: 'credito',
      monto: montoNum,
      saldo_anterior: saldoAnterior,
      saldo_posterior: saldoAnterior - montoNum,
      descripcion: descripcion || 'Pago a proveedor',
      usuario_id: req.user.id
    }).returning('id');

    if (medio_pago_id) {
      const arqueo = await trx('arqueos').where('estado', 'abierto').orderBy('abierto_at', 'desc').first();
      if (arqueo) {
        await trx('movimientos_caja').insert({
          arqueo_id: arqueo.id,
          medio_pago_id: parseInt(medio_pago_id),
          tipo: 'egreso',
          concepto: 'pago_proveedor',
          monto: montoNum,
          referencia_id: id,
          referencia_tipo: 'pago_proveedor',
          descripcion: descripcion || 'Pago a proveedor',
          usuario_id: req.user.id
        });
      }
    }

    await trx.commit();
    res.json({ ok: true, saldo_anterior: saldoAnterior, saldo_posterior: saldoAnterior - montoNum });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
};

const pdfProveedor = async (req, res) => {
  try {
    const { proveedorId } = req.params;
    const proveedor = await db('proveedores').where('id', proveedorId).first();
    if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });

    const movimientos = await db('cuenta_corriente_proveedores')
      .where('proveedor_id', proveedorId).orderBy('id', 'asc');

    const saldo = await getSaldoProveedor(proveedorId);
    const { generarEstadoCuentaPDF } = require('../services/pdfService');
    generarEstadoCuentaPDF({ entidad: proveedor, movimientos, saldo, tipo: 'proveedor' }, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

// ─── Cuotas ──────────────────────────────────────────────────────────────────

const cuotasPendientes = async (req, res) => {
  try {
    const { estado = 'pendiente', dias = 30, cliente_id } = req.query;

    // Auto-mark overdue
    await db('cuotas_cliente')
      .where('estado', 'pendiente')
      .where('fecha_vencimiento', '<', db.fn.now())
      .update({ estado: 'vencida', updated_at: db.fn.now() });

    const applyFilters = (b) => {
      if (estado) b.where('cu.estado', estado);
      if (cliente_id) b.where('cu.cliente_id', cliente_id);
      if (estado === 'pendiente') {
        const limite = new Date();
        limite.setDate(limite.getDate() + parseInt(dias));
        b.where('cu.fecha_vencimiento', '<=', limite.toISOString().split('T')[0]);
      }
    };

    const data = await db('cuotas_cliente as cu')
      .join('clientes as c', 'cu.cliente_id', 'c.id')
      .join('ventas as v', 'cu.venta_id', 'v.id')
      .select('cu.*', 'c.nombre as cliente', 'v.numero as venta_numero')
      .modify(applyFilters)
      .orderBy('cu.fecha_vencimiento', 'asc');

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cuotas' });
  }
};

const pagarCuota = async (req, res) => {
  const { id } = req.params;
  const { medio_pago_id, descripcion } = req.body;

  const trx = await db.transaction();
  try {
    const cuota = await trx('cuotas_cliente as cu')
      .join('ventas as v', 'cu.venta_id', 'v.id')
      .select('cu.*', 'v.numero as venta_numero')
      .where('cu.id', id).first();

    if (!cuota) { await trx.rollback(); return res.status(404).json({ error: 'Cuota no encontrada' }); }
    if (cuota.estado === 'pagada') { await trx.rollback(); return res.status(400).json({ error: 'La cuota ya está pagada' }); }

    const saldoAnterior = await getSaldoCliente(cuota.cliente_id, trx);
    const montoNum = parseFloat(cuota.monto);

    await trx('cuenta_corriente_clientes').insert({
      cliente_id: cuota.cliente_id,
      tipo: 'credito',
      monto: montoNum,
      saldo_anterior: saldoAnterior,
      saldo_posterior: saldoAnterior - montoNum,
      descripcion: descripcion || `Pago cuota ${cuota.numero_cuota} — Venta #${cuota.venta_numero}`,
      usuario_id: req.user.id
    });

    if (medio_pago_id) {
      const arqueo = await trx('arqueos').where('estado', 'abierto').orderBy('abierto_at', 'desc').first();
      if (arqueo) {
        await trx('movimientos_caja').insert({
          arqueo_id: arqueo.id,
          medio_pago_id: parseInt(medio_pago_id),
          tipo: 'ingreso',
          concepto: 'cobro_cta_cte',
          monto: montoNum,
          referencia_id: parseInt(id),
          referencia_tipo: 'cuota',
          descripcion: `Cuota ${cuota.numero_cuota} — Venta #${cuota.venta_numero}`,
          usuario_id: req.user.id
        });
      }
    }

    await trx('cuotas_cliente').where('id', id).update({ estado: 'pagada', updated_at: trx.fn.now() });
    await trx.commit();
    res.json({ ok: true });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al pagar cuota' });
  }
};

module.exports = {
  resumenClientes, estadoCuentaCliente, cobrar, pdfCliente, pdfCobro,
  resumenProveedores, estadoCuentaProveedor, pagar, pdfProveedor,
  cuotasPendientes, pagarCuota
};
