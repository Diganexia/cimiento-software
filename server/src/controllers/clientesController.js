const db = require('../config/db');

const listar = async (req, res) => {
  try {
    const { q, tipo_iva, activo = 'true', page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);

    const applyFilters = (b) => {
      if (activo !== 'all') b.where('activo', activo === 'true');
      if (tipo_iva) b.where('tipo_iva', tipo_iva);
      if (q) b.where((w) => w.whereIlike('nombre', `%${q}%`).orWhereIlike('cuit', `%${q}%`).orWhereIlike('dni', `%${q}%`));
    };

    const [{ total }] = await db('clientes').modify(applyFilters).count('id as total');
    const data = await db('clientes')
      .modify(applyFilters)
      .orderBy('nombre')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    res.json({ data, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

const detalle = async (req, res) => {
  try {
    const cliente = await db('clientes').where('id', req.params.id).first();
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const saldo = await db('cuenta_corriente_clientes')
      .where('cliente_id', cliente.id)
      .orderBy('id', 'desc')
      .first()
      .then((r) => (r ? parseFloat(r.saldo_posterior) : 0));

    res.json({ ...cliente, saldo_cuenta_corriente: saldo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

const crear = async (req, res) => {
  const { nombre, razon_social, cuit, dni, telefono, email, direccion, tipo_iva, tiene_cuenta_corriente, limite_credito } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const [{ id }] = await db('clientes').insert({
      nombre,
      razon_social: razon_social || null,
      cuit: cuit || null,
      dni: dni || null,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
      tipo_iva: tipo_iva || 'consumidor_final',
      tiene_cuenta_corriente: Boolean(tiene_cuenta_corriente),
      limite_credito: parseFloat(limite_credito || 0)
    }).returning('id');
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

const editar = async (req, res) => {
  const { nombre, razon_social, cuit, dni, telefono, email, direccion, tipo_iva, tiene_cuenta_corriente, limite_credito } = req.body;
  try {
    const n = await db('clientes').where('id', req.params.id).update({
      nombre,
      razon_social: razon_social || null,
      cuit: cuit || null,
      dni: dni || null,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
      tipo_iva: tipo_iva || 'consumidor_final',
      tiene_cuenta_corriente: Boolean(tiene_cuenta_corriente),
      limite_credito: parseFloat(limite_credito || 0),
      updated_at: db.fn.now()
    });
    if (!n) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar cliente' });
  }
};

const eliminar = async (req, res) => {
  try {
    const n = await db('clientes').where('id', req.params.id).update({ activo: false, updated_at: db.fn.now() });
    if (!n) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};

const activar = async (req, res) => {
  try {
    const n = await db('clientes').where('id', req.params.id).update({ activo: true, updated_at: db.fn.now() });
    if (!n) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al activar cliente' });
  }
};

module.exports = { listar, detalle, crear, editar, eliminar, activar };
