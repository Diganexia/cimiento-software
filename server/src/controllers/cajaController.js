const db = require('../config/db');

// ─── Cajas ABM ───────────────────────────────────────────────────────────────

const listaCajas = async (_req, res) => {
  try {
    const data = await db('cajas').where('activo', true).orderBy('nombre');
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cajas' });
  }
};

const crearCaja = async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
  try {
    const [{ id }] = await db('cajas').insert({ nombre }).returning('id');
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear caja' });
  }
};

// ─── Arqueos ──────────────────────────────────────────────────────────────────

const abrir = async (req, res) => {
  const { caja_id, saldo_inicial = 0 } = req.body;
  if (!caja_id) return res.status(400).json({ error: 'La caja es requerida' });
  try {
    const abierto = await db('arqueos').where({ caja_id, estado: 'abierto' }).first();
    if (abierto) return res.status(400).json({ error: 'Ya hay un arqueo abierto para esta caja' });

    const [{ id }] = await db('arqueos').insert({
      caja_id,
      usuario_apertura_id: req.user.id,
      saldo_inicial: parseFloat(saldo_inicial),
      estado: 'abierto'
    }).returning('id');

    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al abrir caja' });
  }
};

const cerrar = async (req, res) => {
  const { saldo_declarado = 0 } = req.body;
  try {
    const arqueo = await db('arqueos').where('estado', 'abierto').orderBy('abierto_at', 'desc').first();
    if (!arqueo) return res.status(400).json({ error: 'No hay arqueo abierto' });

    const movs = await db('movimientos_caja').where('arqueo_id', arqueo.id);
    const ingresos = movs.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto), 0);
    const egresos  = movs.filter((m) => m.tipo === 'egreso' ).reduce((s, m) => s + parseFloat(m.monto), 0);
    const saldoCalculado = parseFloat(arqueo.saldo_inicial) + ingresos - egresos;
    const saldoDec = parseFloat(saldo_declarado);

    await db('arqueos').where('id', arqueo.id).update({
      usuario_cierre_id: req.user.id,
      saldo_declarado_cierre: saldoDec,
      saldo_calculado_cierre: saldoCalculado,
      diferencia_cierre: saldoDec - saldoCalculado,
      estado: 'cerrado',
      cerrado_at: db.fn.now()
    });

    res.json({ ok: true, saldo_calculado: saldoCalculado, diferencia: saldoDec - saldoCalculado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cerrar caja' });
  }
};

async function buildResumen(arqueo_id) {
  const rows = await db('movimientos_caja as mc')
    .join('medios_pago as mp', 'mc.medio_pago_id', 'mp.id')
    .where('mc.arqueo_id', arqueo_id)
    .select('mp.id as medio_pago_id', 'mp.nombre as medio_pago', 'mc.tipo')
    .sum('mc.monto as total')
    .groupBy('mp.id', 'mp.nombre', 'mc.tipo');

  const map = {};
  for (const r of rows) {
    if (!map[r.medio_pago_id]) map[r.medio_pago_id] = { medio_pago: r.medio_pago, ingresos: 0, egresos: 0 };
    if (r.tipo === 'ingreso') map[r.medio_pago_id].ingresos = parseFloat(r.total);
    else                      map[r.medio_pago_id].egresos  = parseFloat(r.total);
  }
  return Object.values(map).map((r) => ({ ...r, neto: r.ingresos - r.egresos }));
}

const arqueoActual = async (_req, res) => {
  try {
    const arqueo = await db('arqueos as a')
      .join('cajas as c', 'a.caja_id', 'c.id')
      .join('usuarios as u', 'a.usuario_apertura_id', 'u.id')
      .select('a.*', 'c.nombre as caja', 'u.nombre as usuario_apertura')
      .where('a.estado', 'abierto')
      .orderBy('a.abierto_at', 'desc')
      .first();

    if (!arqueo) return res.json({ arqueo: null });

    const resumen = await buildResumen(arqueo.id);
    const ingresos = resumen.reduce((s, r) => s + r.ingresos, 0);
    const egresos  = resumen.reduce((s, r) => s + r.egresos, 0);
    const saldo_calculado = parseFloat(arqueo.saldo_inicial) + ingresos - egresos;

    const ultMovs = await db('movimientos_caja as mc')
      .join('medios_pago as mp', 'mc.medio_pago_id', 'mp.id')
      .leftJoin('usuarios as u', 'mc.usuario_id', 'u.id')
      .select('mc.*', 'mp.nombre as medio_pago', 'u.nombre as usuario')
      .where('mc.arqueo_id', arqueo.id)
      .orderBy('mc.created_at', 'desc')
      .limit(20);

    res.json({ arqueo, resumen, ingresos, egresos, saldo_calculado, movimientos: ultMovs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener arqueo actual' });
  }
};

const historial = async (req, res) => {
  try {
    const { page = 1, limit = 30, caja_id } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);

    const applyFilters = (b) => {
      if (caja_id) b.where('a.caja_id', caja_id);
    };

    const [{ total }] = await db('arqueos as a').modify(applyFilters).count('a.id as total');

    const data = await db('arqueos as a')
      .join('cajas as c', 'a.caja_id', 'c.id')
      .join('usuarios as ua', 'a.usuario_apertura_id', 'ua.id')
      .leftJoin('usuarios as uc', 'a.usuario_cierre_id', 'uc.id')
      .select(
        'a.id', 'a.estado', 'a.saldo_inicial', 'a.saldo_calculado_cierre',
        'a.saldo_declarado_cierre', 'a.diferencia_cierre', 'a.abierto_at', 'a.cerrado_at',
        'c.nombre as caja',
        'ua.nombre as usuario_apertura',
        'uc.nombre as usuario_cierre'
      )
      .modify(applyFilters)
      .orderBy('a.abierto_at', 'desc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    res.json({ data, total: parseInt(total), page: pageNum, limit: limitNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

const detalleArqueo = async (req, res) => {
  try {
    const arqueo = await db('arqueos as a')
      .join('cajas as c', 'a.caja_id', 'c.id')
      .join('usuarios as ua', 'a.usuario_apertura_id', 'ua.id')
      .leftJoin('usuarios as uc', 'a.usuario_cierre_id', 'uc.id')
      .select('a.*', 'c.nombre as caja', 'ua.nombre as usuario_apertura', 'uc.nombre as usuario_cierre')
      .where('a.id', req.params.id)
      .first();

    if (!arqueo) return res.status(404).json({ error: 'Arqueo no encontrado' });

    const movimientos = await db('movimientos_caja as mc')
      .join('medios_pago as mp', 'mc.medio_pago_id', 'mp.id')
      .leftJoin('usuarios as u', 'mc.usuario_id', 'u.id')
      .select('mc.*', 'mp.nombre as medio_pago', 'u.nombre as usuario')
      .where('mc.arqueo_id', arqueo.id)
      .orderBy('mc.created_at', 'asc');

    const resumen = await buildResumen(arqueo.id);
    const ingresos = resumen.reduce((s, r) => s + r.ingresos, 0);
    const egresos  = resumen.reduce((s, r) => s + r.egresos, 0);
    const saldo_calculado = parseFloat(arqueo.saldo_inicial) + ingresos - egresos;

    res.json({ arqueo, movimientos, resumen, ingresos, egresos, saldo_calculado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener arqueo' });
  }
};

const movimientoManual = async (req, res) => {
  const { tipo, monto, descripcion, medio_pago_id } = req.body;
  if (!tipo || !monto || !medio_pago_id) return res.status(400).json({ error: 'tipo, monto y medio_pago_id son requeridos' });
  if (!['ingreso', 'egreso'].includes(tipo)) return res.status(400).json({ error: 'tipo debe ser ingreso o egreso' });

  try {
    const arqueo = await db('arqueos').where('estado', 'abierto').orderBy('abierto_at', 'desc').first();
    if (!arqueo) return res.status(400).json({ error: 'No hay caja abierta' });

    const [{ id }] = await db('movimientos_caja').insert({
      arqueo_id: arqueo.id,
      medio_pago_id: parseInt(medio_pago_id),
      tipo,
      concepto: 'manual',
      monto: parseFloat(monto),
      descripcion: descripcion || (tipo === 'ingreso' ? 'Ingreso manual' : 'Egreso manual'),
      usuario_id: req.user.id
    }).returning('id');

    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar movimiento' });
  }
};

const pdf = async (req, res) => {
  try {
    const { id } = req.params;

    let arqueo;
    if (id === 'actual') {
      arqueo = await db('arqueos as a')
        .join('cajas as c', 'a.caja_id', 'c.id')
        .join('usuarios as ua', 'a.usuario_apertura_id', 'ua.id')
        .leftJoin('usuarios as uc', 'a.usuario_cierre_id', 'uc.id')
        .select('a.*', 'c.nombre as caja', 'ua.nombre as usuario_apertura', 'uc.nombre as usuario_cierre')
        .where('a.estado', 'abierto').orderBy('a.abierto_at', 'desc').first();
    } else {
      arqueo = await db('arqueos as a')
        .join('cajas as c', 'a.caja_id', 'c.id')
        .join('usuarios as ua', 'a.usuario_apertura_id', 'ua.id')
        .leftJoin('usuarios as uc', 'a.usuario_cierre_id', 'uc.id')
        .select('a.*', 'c.nombre as caja', 'ua.nombre as usuario_apertura', 'uc.nombre as usuario_cierre')
        .where('a.id', id).first();
    }

    if (!arqueo) return res.status(404).json({ error: 'Arqueo no encontrado' });

    const movimientos = await db('movimientos_caja as mc')
      .join('medios_pago as mp', 'mc.medio_pago_id', 'mp.id')
      .select('mc.*', 'mp.nombre as medio_pago')
      .where('mc.arqueo_id', arqueo.id)
      .orderBy('mc.created_at', 'asc');

    const resumen = await buildResumen(arqueo.id);
    const ingresos = resumen.reduce((s, r) => s + r.ingresos, 0);
    const egresos  = resumen.reduce((s, r) => s + r.egresos, 0);
    const saldo_calculado = parseFloat(arqueo.saldo_inicial) + ingresos - egresos;

    const { generarArqueoPDF } = require('../services/pdfService');
    generarArqueoPDF({ arqueo, movimientos, resumen, ingresos, egresos, saldo_calculado }, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

module.exports = { listaCajas, crearCaja, abrir, cerrar, arqueoActual, historial, detalleArqueo, movimientoManual, pdf };
