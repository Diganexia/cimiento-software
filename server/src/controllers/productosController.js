const db = require('../config/db');

const applyFilters = (builder, { activo, rubro_id, busqueda }) => {
  if (activo !== 'all') builder.where('p.activo', activo !== 'false');
  if (rubro_id) builder.where('p.rubro_id', rubro_id);
  if (busqueda) {
    builder.where((b) => {
      b.whereRaw('p.nombre ILIKE ?', [`%${busqueda}%`])
        .orWhereRaw('p.codigo ILIKE ?', [`%${busqueda}%`])
        .orWhereRaw('COALESCE(p.codigo_barra,\'\') ILIKE ?', [`%${busqueda}%`]);
    });
  }
};

const listar = async (req, res) => {
  try {
    const { rubro_id, activo = 'true', q: busqueda, page = 1, limit = 50, deposito_id, ids } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);
    const filters = { activo, rubro_id, busqueda };

    const idList = ids ? ids.split(',').map(Number).filter(Boolean) : null;

    const stockSubquery = deposito_id
      ? db.raw('COALESCE((SELECT spd.cantidad FROM stock_por_deposito spd WHERE spd.producto_id = p.id AND spd.deposito_id = ?), 0) as stock_total', [parseInt(deposito_id)])
      : db.raw('COALESCE((SELECT SUM(spd.cantidad) FROM stock_por_deposito spd WHERE spd.producto_id = p.id), 0) as stock_total');

    const [{ total }] = await db('productos as p')
      .modify(applyFilters, filters)
      .modify((b) => { if (idList) b.whereIn('p.id', idList); })
      .count('p.id as total');

    const data = await db('productos as p')
      .leftJoin('rubros as r', 'p.rubro_id', 'r.id')
      .leftJoin('unidades_medida as um', 'p.unidad_medida_id', 'um.id')
      .leftJoin('proveedores as pv', 'p.proveedor_habitual_id', 'pv.id')
      .select(
        'p.id', 'p.codigo', 'p.codigo_barra', 'p.nombre',
        'p.precio_costo', 'p.precio_venta', 'p.stock_minimo', 'p.activo',
        'r.id as rubro_id', 'r.nombre as rubro',
        'um.id as unidad_medida_id', 'um.nombre as unidad', 'um.abreviatura as unidad_abreviatura',
        'pv.nombre as proveedor',
        stockSubquery
      )
      .modify(applyFilters, filters)
      .modify((b) => { if (idList) b.whereIn('p.id', idList); })
      .orderBy('p.nombre')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    res.json({ data, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

const detalle = async (req, res) => {
  try {
    const producto = await db('productos as p')
      .leftJoin('rubros as r', 'p.rubro_id', 'r.id')
      .leftJoin('unidades_medida as um', 'p.unidad_medida_id', 'um.id')
      .leftJoin('proveedores as pv', 'p.proveedor_habitual_id', 'pv.id')
      .select('p.*', 'r.nombre as rubro', 'um.nombre as unidad', 'um.abreviatura as unidad_abreviatura', 'pv.nombre as proveedor')
      .where('p.id', req.params.id)
      .first();

    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const stock = await db('stock_por_deposito as spd')
      .join('depositos as d', 'spd.deposito_id', 'd.id')
      .select('d.id as deposito_id', 'd.nombre as deposito', 'spd.cantidad')
      .where('spd.producto_id', producto.id);

    res.json({ ...producto, stock_depositos: stock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

const crear = async (req, res) => {
  try {
    const { nombre, codigo, codigo_barra, descripcion, rubro_id, unidad_medida_id, proveedor_habitual_id, precio_costo, precio_venta, stock_minimo } = req.body;
    if (!nombre || !unidad_medida_id) return res.status(400).json({ error: 'Nombre y unidad de medida son requeridos' });

    const [{ id }] = await db('productos').insert({
      nombre,
      codigo: codigo || null,
      codigo_barra: codigo_barra || null,
      descripcion: descripcion || null,
      rubro_id: rubro_id || null,
      unidad_medida_id,
      proveedor_habitual_id: proveedor_habitual_id || null,
      precio_costo: precio_costo || 0,
      precio_venta: precio_venta || 0,
      stock_minimo: stock_minimo || 0
    }).returning('id');

    res.status(201).json({ id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El código o código de barra ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

const editar = async (req, res) => {
  try {
    const { nombre, codigo, codigo_barra, descripcion, rubro_id, unidad_medida_id, proveedor_habitual_id, precio_costo, precio_venta, stock_minimo, activo } = req.body;

    const updated = await db('productos').where('id', req.params.id).update({
      ...(nombre !== undefined && { nombre }),
      codigo: codigo || null,
      codigo_barra: codigo_barra || null,
      descripcion: descripcion || null,
      rubro_id: rubro_id || null,
      ...(unidad_medida_id && { unidad_medida_id }),
      proveedor_habitual_id: proveedor_habitual_id || null,
      ...(precio_costo !== undefined && { precio_costo }),
      ...(precio_venta !== undefined && { precio_venta }),
      ...(stock_minimo !== undefined && { stock_minimo }),
      ...(activo !== undefined && { activo }),
      updated_at: db.fn.now()
    });

    if (!updated) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El código o código de barra ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error al editar producto' });
  }
};

const eliminar = async (req, res) => {
  try {
    const updated = await db('productos').where('id', req.params.id).update({ activo: false, updated_at: db.fn.now() });
    if (!updated) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al dar de baja el producto' });
  }
};

module.exports = { listar, detalle, crear, editar, eliminar };
