const db = require('../config/db');

const puntosVenta = async (_req, res) => {
  try {
    const data = await db('puntos_venta_afip').where('activo', true).orderBy('numero');
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener puntos de venta' });
  }
};

const comprobantes = async (req, res) => {
  try {
    const { venta_id, estado, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);

    const applyFilters = (b) => {
      if (venta_id) b.where('ca.venta_id', venta_id);
      if (estado) b.where('ca.estado', estado);
    };

    const [{ total }] = await db('comprobantes_afip as ca').modify(applyFilters).count('ca.id as total');

    const data = await db('comprobantes_afip as ca')
      .join('ventas as v', 'ca.venta_id', 'v.id')
      .join('puntos_venta_afip as pv', 'ca.punto_venta_id', 'pv.id')
      .leftJoin('clientes as c', 'v.cliente_id', 'c.id')
      .select(
        'ca.*', 'v.numero as venta_numero', 'v.total',
        'pv.numero as punto_venta', 'c.nombre as cliente'
      )
      .modify(applyFilters)
      .orderBy('ca.created_at', 'desc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    res.json({ data, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener comprobantes AFIP' });
  }
};

module.exports = { puntosVenta, comprobantes };
