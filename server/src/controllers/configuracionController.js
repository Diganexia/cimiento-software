const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const EMPRESA_PATH = path.join(__dirname, '../config/empresa.json');

function leerEmpresa() {
  try {
    if (fs.existsSync(EMPRESA_PATH)) {
      return JSON.parse(fs.readFileSync(EMPRESA_PATH, 'utf-8'));
    }
  } catch (_) {}
  return {
    nombre: process.env.EMPRESA_NOMBRE || '',
    cuit: process.env.EMPRESA_CUIT || '',
    direccion: process.env.EMPRESA_DIRECCION || '',
    telefono: process.env.EMPRESA_TELEFONO || '',
    email: '',
    ingresosBrutos: process.env.EMPRESA_IIBB || '',
    inicioActividades: process.env.EMPRESA_INICIO || '',
    condicionIva: ''
  };
}

// â”€â”€ Empresa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function getEmpresa(req, res) {
  res.json(leerEmpresa());
}

async function updateEmpresa(req, res) {
  try {
    const datos = { ...leerEmpresa(), ...req.body };
    fs.writeFileSync(EMPRESA_PATH, JSON.stringify(datos, null, 2), 'utf-8');
    res.json(datos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ Puntos de venta AFIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function listPuntosVenta(req, res) {
  try {
    const rows = await db('puntos_venta_afip').orderBy('numero');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createPuntoVenta(req, res) {
  const { numero, nombre, tipo } = req.body;
  if (!numero || !nombre) return res.status(400).json({ error: 'numero y nombre requeridos' });
  try {
    const existe = await db('puntos_venta_afip').where('numero', numero).first();
    if (existe) return res.status(409).json({ error: 'Ya existe un punto de venta con ese nÃºmero' });
    const [id] = await db('puntos_venta_afip').insert({ numero, nombre, tipo: tipo || 'electronica', activo: true });
    const row = await db('puntos_venta_afip').where('id', id).first();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updatePuntoVenta(req, res) {
  try {
    const { nombre, tipo, activo } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (tipo !== undefined) updates.tipo = tipo;
    if (activo !== undefined) updates.activo = activo;
    await db('puntos_venta_afip').where('id', req.params.id).update(updates);
    const row = await db('puntos_venta_afip').where('id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deletePuntoVenta(req, res) {
  try {
    const usado = await db('comprobantes_afip').where('punto_venta_id', req.params.id).first();
    if (usado) return res.status(409).json({ error: 'Tiene comprobantes AFIP â€” no se puede eliminar, desactÃ­velo' });
    await db('puntos_venta_afip').where('id', req.params.id).delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ Rubros â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function listRubros(req, res) {
  try {
    const rows = await db('rubros as r')
      .leftJoin('rubros as p', 'r.rubro_padre_id', 'p.id')
      .select('r.*', 'p.nombre as rubro_padre')
      .orderBy('r.nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createRubro(req, res) {
  const { nombre, rubro_padre_id } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
  try {
    const [id] = await db('rubros').insert({ nombre, rubro_padre_id: rubro_padre_id || null, activo: true });
    const row = await db('rubros').where('id', id).first();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateRubro(req, res) {
  try {
    const { nombre, rubro_padre_id, activo } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (rubro_padre_id !== undefined) updates.rubro_padre_id = rubro_padre_id || null;
    if (activo !== undefined) updates.activo = activo;
    await db('rubros').where('id', req.params.id).update(updates);
    const row = await db('rubros').where('id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteRubro(req, res) {
  try {
    const usado = await db('productos').where('rubro_id', req.params.id).first();
    if (usado) return res.status(409).json({ error: 'Tiene productos asignados' });
    await db('rubros').where('id', req.params.id).delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ Unidades de medida â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function listUnidades(req, res) {
  try {
    const rows = await db('unidades_medida').orderBy('nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createUnidad(req, res) {
  const { nombre, abreviatura } = req.body;
  if (!nombre || !abreviatura) return res.status(400).json({ error: 'nombre y abreviatura requeridos' });
  try {
    const [id] = await db('unidades_medida').insert({ nombre, abreviatura });
    const row = await db('unidades_medida').where('id', id).first();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateUnidad(req, res) {
  try {
    const { nombre, abreviatura } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (abreviatura !== undefined) updates.abreviatura = abreviatura;
    await db('unidades_medida').where('id', req.params.id).update(updates);
    const row = await db('unidades_medida').where('id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteUnidad(req, res) {
  try {
    const usado = await db('productos').where('unidad_medida_id', req.params.id).first();
    if (usado) return res.status(409).json({ error: 'Tiene productos asignados' });
    await db('unidades_medida').where('id', req.params.id).delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ Medios de pago â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function listMediosPago(req, res) {
  try {
    const rows = await db('medios_pago').orderBy('nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createMedioPago(req, res) {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
  try {
    const [id] = await db('medios_pago').insert({ nombre, activo: true });
    const row = await db('medios_pago').where('id', id).first();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateMedioPago(req, res) {
  try {
    const { nombre, activo } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (activo !== undefined) updates.activo = activo;
    await db('medios_pago').where('id', req.params.id).update(updates);
    const row = await db('medios_pago').where('id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteMedioPago(req, res) {
  try {
    const usado = await db('movimientos_caja').where('medio_pago', req.params.id).first()
      .catch(() => null);
    if (usado) return res.status(409).json({ error: 'Tiene movimientos registrados' });
    await db('medios_pago').where('id', req.params.id).delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ DepÃ³sitos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function listDepositos(req, res) {
  try {
    const rows = await db('depositos').orderBy('nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createDeposito(req, res) {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
  try {
    const [id] = await db('depositos').insert({ nombre, descripcion: descripcion || null, activo: true });
    const row = await db('depositos').where('id', id).first();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateDeposito(req, res) {
  try {
    const { nombre, descripcion, activo } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (activo !== undefined) updates.activo = activo;
    await db('depositos').where('id', req.params.id).update(updates);
    const row = await db('depositos').where('id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteDeposito(req, res) {
  try {
    const conStock = await db('stock').where('deposito_id', req.params.id).first();
    if (conStock) return res.status(409).json({ error: 'El depÃ³sito tiene stock asignado' });
    await db('depositos').where('id', req.params.id).delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ Cajas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function listCajas(req, res) {
  try {
    const rows = await db('cajas').orderBy('nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createCaja(req, res) {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
  try {
    const [id] = await db('cajas').insert({ nombre, activo: true });
    const row = await db('cajas').where('id', id).first();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateCaja(req, res) {
  try {
    const { nombre, activo } = req.body;
    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (activo !== undefined) updates.activo = activo;
    await db('cajas').where('id', req.params.id).update(updates);
    const row = await db('cajas').where('id', req.params.id).first();
    if (!row) return res.status(404).json({ error: 'No encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getEmpresa, updateEmpresa,
  listPuntosVenta, createPuntoVenta, updatePuntoVenta, deletePuntoVenta,
  listRubros, createRubro, updateRubro, deleteRubro,
  listUnidades, createUnidad, updateUnidad, deleteUnidad,
  listMediosPago, createMedioPago, updateMedioPago, deleteMedioPago,
  listDepositos, createDeposito, updateDeposito, deleteDeposito,
  listCajas, createCaja, updateCaja
};

