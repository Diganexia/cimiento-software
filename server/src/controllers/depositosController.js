const db = require('../config/db');

const listar = async (_req, res) => {
  try {
    const data = await db('depositos').where('activo', true).orderBy('nombre');
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener depósitos' });
  }
};

const crear = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const [{ id }] = await db('depositos').insert({ nombre, descripcion: descripcion || null }).returning('id');
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear depósito' });
  }
};

const editar = async (req, res) => {
  try {
    const { nombre, descripcion, activo } = req.body;
    const updated = await db('depositos').where('id', req.params.id).update({
      ...(nombre !== undefined && { nombre }),
      ...(descripcion !== undefined && { descripcion }),
      ...(activo !== undefined && { activo }),
      updated_at: db.fn.now()
    });
    if (!updated) return res.status(404).json({ error: 'Depósito no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar depósito' });
  }
};

module.exports = { listar, crear, editar };
