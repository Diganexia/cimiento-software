const db = require('../config/db');

const stockBajoMinimo = async (_req, res) => {
  try {
    const data = await db('productos as p')
      .leftJoin(
        db('stock_por_deposito').select('producto_id', db.raw('SUM(cantidad) as total')).groupBy('producto_id').as('s'),
        'p.id', 's.producto_id'
      )
      .leftJoin('unidades_medida as um', 'p.unidad_medida_id', 'um.id')
      .select(
        'p.id', 'p.nombre', 'p.codigo', 'p.stock_minimo',
        'um.abreviatura as unidad',
        db.raw('COALESCE(s.total, 0) as stock_actual')
      )
      .where('p.activo', true)
      .whereRaw('COALESCE(s.total, 0) <= p.stock_minimo')
      .orderBy('p.nombre');

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener alertas de stock' });
  }
};

module.exports = { stockBajoMinimo };
