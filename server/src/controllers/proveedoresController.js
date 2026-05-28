const db = require('../config/db');
const { whereIlike } = require('../lib/dbCompat');

const listar = async (req, res) => {
  try {
    const { activo = 'true', q, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200);

    const applyFilters = (b) => {
      if (activo !== 'all') b.where('activo', activo !== 'false');
      if (q) whereIlike(b, 'nombre', `%${q}%`);
    };

    const [{ total }] = await db('proveedores').modify(applyFilters).count('id as total');
    const data = await db('proveedores').modify(applyFilters).orderBy('nombre').limit(limitNum).offset((pageNum - 1) * limitNum);

    res.json({ data, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
};

const detalle = async (req, res) => {
  try {
    const proveedor = await db('proveedores').where('id', req.params.id).first();
    if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(proveedor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener proveedor' });
  }
};

const crear = async (req, res) => {
  try {
    const { nombre, razon_social, cuit, telefono, email, direccion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const [{ id }] = await db('proveedores').insert({
      nombre,
      razon_social: razon_social || null,
      cuit: cuit || null,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null
    }).returning('id');
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
};

const editar = async (req, res) => {
  try {
    const { nombre, razon_social, cuit, telefono, email, direccion, activo } = req.body;
    const updated = await db('proveedores').where('id', req.params.id).update({
      ...(nombre !== undefined && { nombre }),
      razon_social: razon_social || null,
      cuit: cuit || null,
      telefono: telefono || null,
      email: email || null,
      direccion: direccion || null,
      ...(activo !== undefined && { activo }),
      updated_at: db.fn.now()
    });
    if (!updated) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar proveedor' });
  }
};

const eliminar = async (req, res) => {
  try {
    const compra = await db('compras').where('proveedor_id', req.params.id).first();
    if (compra) return res.status(409).json({ error: 'Tiene compras registradas — desactivelo en lugar de eliminarlo' });
    const deleted = await db('proveedores').where('id', req.params.id).delete();
    if (!deleted) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
};

module.exports = { listar, detalle, crear, editar, eliminar };
