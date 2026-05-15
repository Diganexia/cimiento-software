const db = require('../config/db');

const listarRubros = async (req, res) => {
  try {
    const rubros = await db('rubros').where('activo', true).orderBy('nombre');
    const map = {};
    rubros.forEach((r) => { map[r.id] = { ...r, hijos: [] }; });
    const tree = [];
    rubros.forEach((r) => {
      if (r.rubro_padre_id && map[r.rubro_padre_id]) {
        map[r.rubro_padre_id].hijos.push(map[r.id]);
      } else {
        tree.push(map[r.id]);
      }
    });
    res.json(tree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener rubros' });
  }
};

const listarUnidadesMedida = async (_req, res) => {
  try {
    const data = await db('unidades_medida').orderBy('nombre');
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener unidades de medida' });
  }
};

module.exports = { listarRubros, listarUnidadesMedida };
