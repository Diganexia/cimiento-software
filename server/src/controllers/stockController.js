const db = require('../config/db');
const { upsertStock, registrarMovimiento, getStockDeposito } = require('../helpers/stockHelper');

const listar = async (req, res) => {
  try {
    const { deposito_id, q } = req.query;
    let query = db('stock_por_deposito as spd')
      .join('productos as p', 'spd.producto_id', 'p.id')
      .join('depositos as d', 'spd.deposito_id', 'd.id')
      .leftJoin('unidades_medida as um', 'p.unidad_medida_id', 'um.id')
      .leftJoin('rubros as r', 'p.rubro_id', 'r.id')
      .select(
        'p.id as producto_id', 'p.nombre as producto', 'p.codigo', 'p.stock_minimo',
        'um.abreviatura as unidad',
        'r.nombre as rubro',
        'd.id as deposito_id', 'd.nombre as deposito',
        'spd.cantidad', 'spd.updated_at'
      )
      .where('p.activo', true);

    if (deposito_id) query = query.where('spd.deposito_id', deposito_id);
    if (q) query = query.whereRaw('p.nombre ILIKE ?', [`%${q}%`]);

    const data = await query.orderBy('p.nombre');
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener stock' });
  }
};

const movimientos = async (req, res) => {
  try {
    const { producto_id, tipo, desde, hasta, usuario_id, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);

    const applyFilters = (b) => {
      if (producto_id) b.where('ms.producto_id', producto_id);
      if (tipo) b.where('ms.tipo', tipo);
      if (usuario_id) b.where('ms.usuario_id', usuario_id);
      if (desde) b.where('ms.created_at', '>=', desde);
      if (hasta) b.where('ms.created_at', '<=', hasta + ' 23:59:59');
    };

    const [{ total }] = await db('movimientos_stock as ms').modify(applyFilters).count('ms.id as total');

    const data = await db('movimientos_stock as ms')
      .join('productos as p', 'ms.producto_id', 'p.id')
      .join('usuarios as u', 'ms.usuario_id', 'u.id')
      .leftJoin('depositos as do', 'ms.deposito_origen_id', 'do.id')
      .leftJoin('depositos as dd', 'ms.deposito_destino_id', 'dd.id')
      .select(
        'ms.id', 'ms.tipo', 'ms.cantidad', 'ms.cantidad_anterior', 'ms.cantidad_posterior',
        'ms.motivo', 'ms.referencia_id', 'ms.referencia_tipo', 'ms.created_at',
        'p.nombre as producto', 'p.codigo',
        'u.nombre as usuario',
        'do.nombre as deposito_origen',
        'dd.nombre as deposito_destino'
      )
      .modify(applyFilters)
      .orderBy('ms.created_at', 'desc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    res.json({ data, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
};

const transferencia = async (req, res) => {
  const { producto_id, deposito_origen_id, deposito_destino_id, cantidad, motivo } = req.body;

  if (!producto_id || !deposito_origen_id || !deposito_destino_id || !cantidad) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  if (parseInt(deposito_origen_id) === parseInt(deposito_destino_id)) {
    return res.status(400).json({ error: 'Los depósitos deben ser distintos' });
  }
  const cant = parseFloat(cantidad);
  if (cant <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });

  const trx = await db.transaction();
  try {
    const stockOrigen = await getStockDeposito(producto_id, deposito_origen_id, trx);
    if (stockOrigen < cant) {
      await trx.rollback();
      return res.status(400).json({ error: `Stock insuficiente. Disponible: ${stockOrigen}` });
    }

    const stockDestino = await getStockDeposito(producto_id, deposito_destino_id, trx);

    await upsertStock(producto_id, deposito_origen_id, -cant, trx);
    await upsertStock(producto_id, deposito_destino_id, cant, trx);

    await registrarMovimiento({
      producto_id, deposito_origen_id, deposito_destino_id: null,
      tipo: 'TRANSFERENCIA_SALIDA', cantidad: cant,
      cantidad_anterior: stockOrigen, cantidad_posterior: stockOrigen - cant,
      motivo: motivo || null, usuario_id: req.user.id
    }, trx);

    await registrarMovimiento({
      producto_id, deposito_origen_id: null, deposito_destino_id,
      tipo: 'TRANSFERENCIA_ENTRADA', cantidad: cant,
      cantidad_anterior: stockDestino, cantidad_posterior: stockDestino + cant,
      motivo: motivo || null, usuario_id: req.user.id
    }, trx);

    await trx.commit();
    res.json({ ok: true });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error en la transferencia' });
  }
};

const ajuste = async (req, res) => {
  const { producto_id, deposito_id, cantidad_nueva, motivo } = req.body;

  if (!producto_id || !deposito_id || cantidad_nueva === undefined || !motivo) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  const cantNueva = parseFloat(cantidad_nueva);
  if (cantNueva < 0) return res.status(400).json({ error: 'La cantidad no puede ser negativa' });

  const trx = await db.transaction();
  try {
    const cantAnterior = await getStockDeposito(producto_id, deposito_id, trx);
    const delta = cantNueva - cantAnterior;
    const tipo = delta >= 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';

    const existing = await trx('stock_por_deposito').where({ producto_id, deposito_id }).first();
    if (existing) {
      await trx('stock_por_deposito').where({ producto_id, deposito_id }).update({ cantidad: cantNueva, updated_at: db.fn.now() });
    } else {
      await trx('stock_por_deposito').insert({ producto_id, deposito_id, cantidad: cantNueva });
    }

    await registrarMovimiento({
      producto_id, deposito_destino_id: deposito_id,
      tipo, cantidad: Math.abs(delta),
      cantidad_anterior: cantAnterior, cantidad_posterior: cantNueva,
      motivo, usuario_id: req.user.id
    }, trx);

    await trx.commit();
    res.json({ ok: true });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error en el ajuste' });
  }
};

module.exports = { listar, movimientos, transferencia, ajuste };
