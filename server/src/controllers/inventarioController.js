const db = require('../config/db');
const { registrarMovimiento } = require('../helpers/stockHelper');

const abrir = async (req, res) => {
  const { deposito_id, observaciones } = req.body;
  if (!deposito_id) return res.status(400).json({ error: 'Depósito requerido' });

  const existente = await db('inventarios').where({ deposito_id, estado: 'abierto' }).first();
  if (existente) {
    return res.status(409).json({ error: 'Ya hay un inventario abierto para este depósito', inventario_id: existente.id });
  }

  const trx = await db.transaction();
  try {
    const [{ id }] = await trx('inventarios').insert({
      deposito_id, usuario_id: req.user.id, observaciones: observaciones || null
    }).returning('id');

    const stockActual = await trx('stock_por_deposito as spd')
      .join('productos as p', 'spd.producto_id', 'p.id')
      .select('spd.producto_id', 'spd.cantidad')
      .where('spd.deposito_id', deposito_id)
      .where('p.activo', true);

    if (stockActual.length > 0) {
      await trx('inventarios_items').insert(
        stockActual.map((s) => ({
          inventario_id: id,
          producto_id: s.producto_id,
          cantidad_sistema: s.cantidad
        }))
      );
    }

    await trx.commit();
    res.status(201).json({ id });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al abrir inventario' });
  }
};

const obtener = async (req, res) => {
  try {
    const inventario = await db('inventarios as i')
      .join('depositos as d', 'i.deposito_id', 'd.id')
      .join('usuarios as u', 'i.usuario_id', 'u.id')
      .select('i.*', 'd.nombre as deposito', 'u.nombre as usuario')
      .where('i.id', req.params.id)
      .first();

    if (!inventario) return res.status(404).json({ error: 'Inventario no encontrado' });

    const items = await db('inventarios_items as ii')
      .join('productos as p', 'ii.producto_id', 'p.id')
      .leftJoin('unidades_medida as um', 'p.unidad_medida_id', 'um.id')
      .select('ii.*', 'p.nombre as producto', 'p.codigo', 'um.abreviatura as unidad')
      .where('ii.inventario_id', inventario.id)
      .orderBy('p.nombre');

    res.json({ ...inventario, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
};

const actualizarItems = async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items debe ser un array' });

  try {
    const inventario = await db('inventarios').where('id', req.params.id).first();
    if (!inventario) return res.status(404).json({ error: 'Inventario no encontrado' });
    if (inventario.estado !== 'abierto') return res.status(400).json({ error: 'El inventario no está abierto' });

    for (const item of items) {
      const row = await db('inventarios_items')
        .where({ inventario_id: inventario.id, producto_id: item.producto_id })
        .first();

      if (!row) continue;
      const contada = parseFloat(item.cantidad_contada);
      const diferencia = contada - parseFloat(row.cantidad_sistema);

      await db('inventarios_items')
        .where({ inventario_id: inventario.id, producto_id: item.producto_id })
        .update({ cantidad_contada: contada, diferencia });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar items' });
  }
};

const confirmar = async (req, res) => {
  const trx = await db.transaction();
  try {
    const inventario = await trx('inventarios').where('id', req.params.id).first();
    if (!inventario) { await trx.rollback(); return res.status(404).json({ error: 'Inventario no encontrado' }); }
    if (inventario.estado !== 'abierto') { await trx.rollback(); return res.status(400).json({ error: 'El inventario no está abierto' }); }

    const items = await trx('inventarios_items')
      .where('inventario_id', inventario.id)
      .whereNotNull('cantidad_contada');

    for (const item of items) {
      const cantAnterior = parseFloat(item.cantidad_sistema);
      const cantNueva = parseFloat(item.cantidad_contada);
      if (cantNueva === cantAnterior) continue;

      await trx('stock_por_deposito')
        .where({ producto_id: item.producto_id, deposito_id: inventario.deposito_id })
        .update({ cantidad: cantNueva, updated_at: db.fn.now() });

      await registrarMovimiento({
        producto_id: item.producto_id,
        deposito_destino_id: inventario.deposito_id,
        tipo: 'INVENTARIO',
        cantidad: Math.abs(cantNueva - cantAnterior),
        cantidad_anterior: cantAnterior,
        cantidad_posterior: cantNueva,
        referencia_id: inventario.id,
        referencia_tipo: 'inventario',
        motivo: `Inventario físico #${inventario.id}`,
        usuario_id: req.user.id
      }, trx);
    }

    await trx('inventarios').where('id', inventario.id).update({ estado: 'confirmado', updated_at: trx.fn.now() });
    await trx.commit();
    res.json({ ok: true });
  } catch (err) {
    await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al confirmar inventario' });
  }
};

const cancelar = async (req, res) => {
  try {
    const inventario = await db('inventarios').where('id', req.params.id).first();
    if (!inventario) return res.status(404).json({ error: 'Inventario no encontrado' });
    if (inventario.estado !== 'abierto') return res.status(400).json({ error: 'El inventario no está abierto' });
    await db('inventarios').where('id', req.params.id).update({ estado: 'cancelado', updated_at: db.fn.now() });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cancelar inventario' });
  }
};

module.exports = { abrir, obtener, actualizarItems, confirmar, cancelar };
