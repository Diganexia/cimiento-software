const db = require('../config/db');
const { generarReporteTablaPDF } = require('../services/pdfService');
const { IS_SQLITE, sqlHastaFinDia, rawRows } = require('../lib/dbCompat');

// â”€â”€ Helpers CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function toCSV(headers, rows, keys) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(';') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(';')];
  for (const row of rows) lines.push(keys.map((k) => escape(row[k])).join(';'));
  return 'ï»¿' + lines.join('\r\n');
}

function sendCSV(res, filename, content) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
}

const fmtNum = (n) => parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// â”€â”€ KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function kpis(req, res) {
  try {
    const ventasRes = await db.raw(`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
      FROM ventas WHERE estado = 'confirmada' AND DATE(created_at) = CURRENT_DATE
    `);

    const stockBajoRes = await db.raw(`
      SELECT COUNT(*) as cantidad FROM productos p WHERE p.activo = true
      AND COALESCE((SELECT SUM(cantidad) FROM stock_por_deposito WHERE producto_id = p.id), 0) <= p.stock_minimo
    `);

    const arqueo = await db('arqueos').where('estado', 'abierto').orderBy('id', 'desc').first();
    let cajaActual = null;
    if (arqueo) {
      const cajaRes = await db.raw(`
        SELECT
          COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END), 0) as ingresos,
          COALESCE(SUM(CASE WHEN tipo='egreso'  THEN monto ELSE 0 END), 0) as egresos
        FROM movimientos_caja WHERE arqueo_id = ?
      `, [arqueo.id]);
      const r = cajaRes.rows[0];
      cajaActual = {
        saldo: parseFloat(arqueo.saldo_inicial) + parseFloat(r.ingresos) - parseFloat(r.egresos)
      };
    }

    const deudoresRes = await db.raw(`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(saldo_posterior), 0) as total
      FROM (
        SELECT DISTINCT ON (cliente_id) saldo_posterior
        FROM cuenta_corriente_clientes ORDER BY cliente_id, id DESC
      ) t WHERE saldo_posterior > 0
    `);

    const v = ventasRes.rows[0];
    const d = deudoresRes.rows[0];
    res.json({
      ventasHoy: { cantidad: parseInt(v.cantidad), total: parseFloat(v.total) },
      stockBajo: parseInt(stockBajoRes.rows[0].cantidad),
      cajaActual,
      deudores: { cantidad: parseInt(d.cantidad), total: parseFloat(d.total) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ Ventas por perÃ­odo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function ventasPorPeriodo(req, res) {
  const { periodo = 'dia', desde, hasta, format } = req.query;
  if (!desde || !hasta) return res.status(400).json({ error: 'desde y hasta requeridos' });

  const truncMap = { dia: 'day', semana: 'week', mes: 'month' };
  const trunc = truncMap[periodo] || 'day';

  try {
    let rawResult;
    if (IS_SQLITE) {
      const fmtMap = { dia: '%Y-%m-%d', semana: '%Y-%W', mes: '%Y-%m' };
      const fmt = fmtMap[periodo] || '%Y-%m-%d';
      rawResult = await rawRows(db, `
        SELECT
          strftime('${fmt}', created_at) as fecha,
          COUNT(*) as cantidad,
          COALESCE(SUM(total), 0) as total,
          COALESCE(SUM(descuento_monto), 0) as descuentos
        FROM ventas
        WHERE estado = 'confirmada'
          AND created_at >= ?
          AND created_at < date(?, '+1 day')
        GROUP BY strftime('${fmt}', created_at)
        ORDER BY fecha
      `, [desde, hasta]);
    } else {
      rawResult = await rawRows(db, `
        SELECT
          DATE_TRUNC('${trunc}', created_at) as fecha,
          COUNT(*) as cantidad,
          COALESCE(SUM(total), 0) as total,
          COALESCE(SUM(descuento_monto), 0) as descuentos
        FROM ventas
        WHERE estado = 'confirmada'
          AND created_at >= ?
          AND created_at < (?::date + INTERVAL '1 day')
        GROUP BY DATE_TRUNC('${trunc}', created_at)
        ORDER BY fecha
      `, [desde, hasta]);
    }

    const rows = rawResult.map((r) => ({
      fecha: new Date(r.fecha).toLocaleDateString('es-AR'),
      fecha_raw: r.fecha,
      cantidad: parseInt(r.cantidad),
      total: parseFloat(r.total),
      descuentos: parseFloat(r.descuentos)
    }));

    const totales = {
      cantidad: rows.reduce((a, r) => a + r.cantidad, 0),
      total: rows.reduce((a, r) => a + r.total, 0)
    };

    if (format === 'csv') {
      const csv = toCSV(
        ['Fecha', 'Cantidad ventas', 'Total $', 'Descuentos $'],
        rows, ['fecha', 'cantidad', 'total', 'descuentos']
      );
      return sendCSV(res, 'ventas-periodo.csv', csv);
    }

    if (format === 'pdf') {
      return generarReporteTablaPDF({
        titulo: 'Ventas por perÃ­odo',
        subtitulo: `PerÃ­odo: ${desde} â†’ ${hasta} | AgrupaciÃ³n: ${periodo}`,
        columnas: [
          { label: 'Fecha', key: 'fecha', width: 100 },
          { label: 'Cantidad', key: 'cantidad', width: 80, align: 'right' },
          { label: 'Total $', key: 'total', width: 110, align: 'right', render: (r) => `$${fmtNum(r.total)}` },
          { label: 'Descuentos $', key: 'descuentos', width: 100, align: 'right', render: (r) => `$${fmtNum(r.descuentos)}` }
        ],
        filas: rows,
        totales: { 'Total perÃ­odo': `$${fmtNum(totales.total)}`, 'Total ventas': String(totales.cantidad) }
      }, res);
    }

    res.json({ rows, totales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ Ranking productos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function rankingProductos(req, res) {
  const { desde, hasta, limit = 20, format } = req.query;
  if (!desde || !hasta) return res.status(400).json({ error: 'desde y hasta requeridos' });

  try {
    const castFloat = IS_SQLITE ? 'CAST(SUM(vi.cantidad) AS REAL)' : 'SUM(vi.cantidad)::float';
    const dateEnd = IS_SQLITE ? 'date(?, \'+1 day\')' : '(?::date + INTERVAL \'1 day\')';
    const rawResult = await rawRows(db, `
      SELECT
        p.id, p.codigo, p.nombre,
        ${castFloat} as total_vendido,
        COALESCE(SUM(vi.subtotal), 0) as total_monto
      FROM ventas_items vi
      JOIN ventas v ON vi.venta_id = v.id
      JOIN productos p ON vi.producto_id = p.id
      WHERE v.estado = 'confirmada'
        AND v.created_at >= ?
        AND v.created_at < ${dateEnd}
      GROUP BY p.id, p.codigo, p.nombre
      ORDER BY total_vendido DESC
      LIMIT ?
    `, [desde, hasta, parseInt(limit)]);

    const rows = rawResult.map((r, i) => ({
      posicion: i + 1,
      codigo: r.codigo || '',
      nombre: r.nombre,
      total_vendido: parseFloat(r.total_vendido),
      total_monto: parseFloat(r.total_monto)
    }));

    if (format === 'csv') {
      const csv = toCSV(
        ['#', 'CÃ³digo', 'Nombre', 'Cantidad vendida', 'Total $'],
        rows, ['posicion', 'codigo', 'nombre', 'total_vendido', 'total_monto']
      );
      return sendCSV(res, 'ranking-productos.csv', csv);
    }

    if (format === 'pdf') {
      return generarReporteTablaPDF({
        titulo: 'Ranking de productos mÃ¡s vendidos',
        subtitulo: `PerÃ­odo: ${desde} â†’ ${hasta}`,
        columnas: [
          { label: '#', key: 'posicion', width: 30 },
          { label: 'CÃ³digo', key: 'codigo', width: 70 },
          { label: 'Nombre', key: 'nombre', width: 200 },
          { label: 'Cant. vendida', key: 'total_vendido', width: 90, align: 'right' },
          { label: 'Total $', key: 'total_monto', width: 100, align: 'right', render: (r) => `$${fmtNum(r.total_monto)}` }
        ],
        filas: rows,
        totales: { 'Total facturado': `$${fmtNum(rows.reduce((a, r) => a + r.total_monto, 0))}` }
      }, res);
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ Stock valorizado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function stockValorizado(req, res) {
  const { deposito_id, format } = req.query;

  try {
    let query = db('stock_por_deposito as s')
      .join('productos as p', 's.producto_id', 'p.id')
      .join('depositos as d', 's.deposito_id', 'd.id')
      .where('p.activo', true)
      .where('s.cantidad', '>', 0)
      .select(
        'p.codigo', 'p.nombre',
        'd.nombre as deposito',
        's.cantidad',
        'p.precio_costo',
        'p.precio_venta',
        db.raw('s.cantidad * p.precio_costo as valor_costo'),
        db.raw('s.cantidad * p.precio_venta as valor_venta')
      )
      .orderBy(['d.nombre', 'p.nombre']);

    if (deposito_id) query = query.where('s.deposito_id', deposito_id);

    const rawRows = await query;
    const rows = rawRows.map((r) => ({
      deposito: r.deposito,
      codigo: r.codigo || '',
      nombre: r.nombre,
      cantidad: parseFloat(r.cantidad),
      precio_costo: parseFloat(r.precio_costo),
      precio_venta: parseFloat(r.precio_venta),
      valor_costo: parseFloat(r.valor_costo),
      valor_venta: parseFloat(r.valor_venta)
    }));

    const totales = {
      valor_costo: rows.reduce((a, r) => a + r.valor_costo, 0),
      valor_venta: rows.reduce((a, r) => a + r.valor_venta, 0)
    };

    if (format === 'csv') {
      const csv = toCSV(
        ['DepÃ³sito', 'CÃ³digo', 'Nombre', 'Cantidad', 'P.Costo', 'P.Venta', 'Valor costo', 'Valor venta'],
        rows, ['deposito', 'codigo', 'nombre', 'cantidad', 'precio_costo', 'precio_venta', 'valor_costo', 'valor_venta']
      );
      return sendCSV(res, 'stock-valorizado.csv', csv);
    }

    if (format === 'pdf') {
      return generarReporteTablaPDF({
        titulo: 'Stock valorizado',
        subtitulo: 'Productos con stock disponible Ã— precio costo / venta',
        landscape: true,
        columnas: [
          { label: 'DepÃ³sito', key: 'deposito', width: 90 },
          { label: 'CÃ³digo', key: 'codigo', width: 70 },
          { label: 'Nombre', key: 'nombre', width: 170 },
          { label: 'Cantidad', key: 'cantidad', width: 65, align: 'right' },
          { label: 'P.Costo', key: 'precio_costo', width: 80, align: 'right', render: (r) => `$${fmtNum(r.precio_costo)}` },
          { label: 'P.Venta', key: 'precio_venta', width: 80, align: 'right', render: (r) => `$${fmtNum(r.precio_venta)}` },
          { label: 'Valor costo', key: 'valor_costo', width: 95, align: 'right', render: (r) => `$${fmtNum(r.valor_costo)}` },
          { label: 'Valor venta', key: 'valor_venta', width: 95, align: 'right', render: (r) => `$${fmtNum(r.valor_venta)}` }
        ],
        filas: rows,
        totales: {
          'Total a costo': `$${fmtNum(totales.valor_costo)}`,
          'Total a precio venta': `$${fmtNum(totales.valor_venta)}`
        }
      }, res);
    }

    res.json({ rows, totales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ RotaciÃ³n de stock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function rotacionStock(req, res) {
  const { dias = 30, format } = req.query;

  try {
    const result = await db.raw(`
      SELECT
        p.id, p.codigo, p.nombre,
        MAX(ms.created_at) as ultimo_movimiento,
        EXTRACT(DAY FROM NOW() - MAX(ms.created_at))::integer as dias_sin_movimiento,
        COALESCE((SELECT SUM(cantidad) FROM stock_por_deposito WHERE producto_id = p.id), 0) as stock_actual
      FROM productos p
      LEFT JOIN movimientos_stock ms ON ms.producto_id = p.id AND ms.tipo = 'SALIDA_VENTA'
      WHERE p.activo = true
      GROUP BY p.id, p.codigo, p.nombre
      HAVING MAX(ms.created_at) IS NULL OR EXTRACT(DAY FROM NOW() - MAX(ms.created_at)) >= ?
      ORDER BY dias_sin_movimiento DESC NULLS FIRST
    `, [parseInt(dias)]);

    const rows = result.rows.map((r) => ({
      codigo: r.codigo || '',
      nombre: r.nombre,
      ultimo_movimiento: r.ultimo_movimiento
        ? new Date(r.ultimo_movimiento).toLocaleDateString('es-AR')
        : 'Sin movimiento',
      dias_sin_movimiento: r.dias_sin_movimiento ?? 'â€”',
      stock_actual: parseFloat(r.stock_actual)
    }));

    if (format === 'csv') {
      const csv = toCSV(
        ['CÃ³digo', 'Nombre', 'Ãšltimo movimiento', 'DÃ­as sin venta', 'Stock actual'],
        rows, ['codigo', 'nombre', 'ultimo_movimiento', 'dias_sin_movimiento', 'stock_actual']
      );
      return sendCSV(res, 'rotacion-stock.csv', csv);
    }

    if (format === 'pdf') {
      return generarReporteTablaPDF({
        titulo: 'RotaciÃ³n de stock',
        subtitulo: `Productos sin venta en ${dias} dÃ­as o mÃ¡s`,
        columnas: [
          { label: 'CÃ³digo', key: 'codigo', width: 80 },
          { label: 'Nombre', key: 'nombre', width: 220 },
          { label: 'Ãšltima venta', key: 'ultimo_movimiento', width: 100 },
          { label: 'DÃ­as sin venta', key: 'dias_sin_movimiento', width: 100, align: 'right' },
          { label: 'Stock actual', key: 'stock_actual', width: 90, align: 'right' }
        ],
        filas: rows
      }, res);
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ Kardex â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function kardex(req, res) {
  const { desde, hasta, deposito_id, format } = req.query;
  const { productoId } = req.params;

  try {
    const producto = await db('productos').where('id', productoId).first();
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    let query = db('movimientos_stock as ms')
      .leftJoin('depositos as do', 'ms.deposito_origen_id', 'do.id')
      .leftJoin('depositos as dd', 'ms.deposito_destino_id', 'dd.id')
      .leftJoin('usuarios as u', 'ms.usuario_id', 'u.id')
      .where('ms.producto_id', productoId)
      .select(
        'ms.id', 'ms.tipo', 'ms.cantidad', 'ms.cantidad_anterior', 'ms.cantidad_posterior',
        'ms.motivo', 'ms.created_at',
        'do.nombre as deposito_origen',
        'dd.nombre as deposito_destino',
        'u.nombre as usuario'
      )
      .orderBy('ms.created_at', 'asc');

    if (deposito_id) {
      query = query.where(function () {
        this.where('ms.deposito_origen_id', deposito_id).orWhere('ms.deposito_destino_id', deposito_id);
      });
    }
    if (desde) query = query.whereRaw('ms.created_at >= ?', [desde]);
    if (hasta) query = query.whereRaw(sqlHastaFinDia('ms.created_at'), [hasta]);

    const rows = (await query).map((r) => ({
      fecha: new Date(r.created_at).toLocaleString('es-AR'),
      tipo: r.tipo,
      deposito_origen: r.deposito_origen || 'â€”',
      deposito_destino: r.deposito_destino || 'â€”',
      cantidad: parseFloat(r.cantidad),
      cantidad_anterior: parseFloat(r.cantidad_anterior),
      cantidad_posterior: parseFloat(r.cantidad_posterior),
      motivo: r.motivo || '',
      usuario: r.usuario || ''
    }));

    if (format === 'csv') {
      const csv = toCSV(
        ['Fecha', 'Tipo', 'Dep. origen', 'Dep. destino', 'Cantidad', 'Stock anterior', 'Stock posterior', 'Motivo', 'Usuario'],
        rows, ['fecha', 'tipo', 'deposito_origen', 'deposito_destino', 'cantidad', 'cantidad_anterior', 'cantidad_posterior', 'motivo', 'usuario']
      );
      return sendCSV(res, `kardex-${producto.nombre.toLowerCase().replace(/\s/g, '-')}.csv`, csv);
    }

    if (format === 'pdf') {
      return generarReporteTablaPDF({
        titulo: `Kardex â€” ${producto.nombre}`,
        subtitulo: producto.codigo ? `CÃ³digo: ${producto.codigo}` : undefined,
        landscape: true,
        columnas: [
          { label: 'Fecha', key: 'fecha', width: 110 },
          { label: 'Tipo', key: 'tipo', width: 120 },
          { label: 'Dep. origen', key: 'deposito_origen', width: 90 },
          { label: 'Dep. destino', key: 'deposito_destino', width: 90 },
          { label: 'Cantidad', key: 'cantidad', width: 65, align: 'right' },
          { label: 'Ant.', key: 'cantidad_anterior', width: 60, align: 'right' },
          { label: 'Post.', key: 'cantidad_posterior', width: 60, align: 'right' },
          { label: 'Usuario', key: 'usuario', width: 90 }
        ],
        filas: rows
      }, res);
    }

    res.json({ producto, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ Deudores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function deudoresClientes(req, res) {
  const { format } = req.query;

  try {
    const result = await db.raw(`
      SELECT c.id, c.nombre, c.cuit, c.telefono, c.email, t.saldo_posterior as saldo
      FROM clientes c
      JOIN (
        SELECT DISTINCT ON (cliente_id) cliente_id, saldo_posterior
        FROM cuenta_corriente_clientes ORDER BY cliente_id, id DESC
      ) t ON t.cliente_id = c.id
      WHERE t.saldo_posterior > 0
      ORDER BY t.saldo_posterior DESC
    `);

    const rows = result.rows.map((r) => ({ ...r, saldo: parseFloat(r.saldo) }));
    const total = rows.reduce((a, r) => a + r.saldo, 0);

    if (format === 'csv') {
      const csv = toCSV(
        ['Nombre', 'CUIT', 'TelÃ©fono', 'Email', 'Saldo deudor $'],
        rows, ['nombre', 'cuit', 'telefono', 'email', 'saldo']
      );
      return sendCSV(res, 'deudores-clientes.csv', csv);
    }

    if (format === 'pdf') {
      return generarReporteTablaPDF({
        titulo: 'Deudores â€” Cuentas corrientes clientes',
        subtitulo: `Total deudores: $${fmtNum(total)}`,
        columnas: [
          { label: 'Nombre', key: 'nombre', width: 180 },
          { label: 'CUIT', key: 'cuit', width: 100 },
          { label: 'TelÃ©fono', key: 'telefono', width: 100 },
          { label: 'Email', key: 'email', width: 140 },
          { label: 'Saldo $', key: 'saldo', width: 100, align: 'right', render: (r) => `$${fmtNum(r.saldo)}` }
        ],
        filas: rows,
        totales: { 'Total deuda': `$${fmtNum(total)}` }
      }, res);
    }

    res.json({ rows, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// â”€â”€ Comprobantes AFIP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function comprobantesAfip(req, res) {
  const { desde, hasta, estado, format } = req.query;
  if (!desde || !hasta) return res.status(400).json({ error: 'desde y hasta requeridos' });

  try {
    let query = db('comprobantes_afip as ca')
      .join('puntos_venta_afip as pv', 'ca.punto_venta_id', 'pv.id')
      .join('ventas as v', 'ca.venta_id', 'v.id')
      .leftJoin('clientes as c', 'v.cliente_id', 'c.id')
      .whereRaw('ca.created_at >= ?', [desde])
      .whereRaw(sqlHastaFinDia('ca.created_at'), [hasta])
      .select(
        'ca.tipo_comprobante', 'ca.numero', 'ca.cae', 'ca.cae_vencimiento',
        'ca.estado', 'ca.created_at',
        'pv.nombre as punto_venta',
        'v.total',
        db.raw("COALESCE(c.nombre, c.razon_social, 'Ocasional') as cliente")
      )
      .orderBy('ca.created_at', 'desc');

    if (estado) query = query.where('ca.estado', estado);

    const rawRows = await query;
    const rows = rawRows.map((r) => ({
      fecha: new Date(r.created_at).toLocaleDateString('es-AR'),
      tipo_comprobante: r.tipo_comprobante,
      numero: r.numero,
      cae: r.cae || '',
      cae_vencimiento: r.cae_vencimiento || '',
      estado: r.estado,
      punto_venta: r.punto_venta,
      cliente: r.cliente,
      total: parseFloat(r.total)
    }));

    const totales = {
      cantidad: rows.length,
      total: rows.reduce((a, r) => a + r.total, 0)
    };

    if (format === 'csv') {
      const csv = toCSV(
        ['Fecha', 'Tipo', 'NÂ°', 'CAE', 'Venc. CAE', 'Estado', 'Punto venta', 'Cliente', 'Total $'],
        rows, ['fecha', 'tipo_comprobante', 'numero', 'cae', 'cae_vencimiento', 'estado', 'punto_venta', 'cliente', 'total']
      );
      return sendCSV(res, 'comprobantes-afip.csv', csv);
    }

    if (format === 'pdf') {
      return generarReporteTablaPDF({
        titulo: 'Comprobantes ARCA emitidos',
        subtitulo: `PerÃ­odo: ${desde} â†’ ${hasta}`,
        landscape: true,
        columnas: [
          { label: 'Fecha', key: 'fecha', width: 80 },
          { label: 'Tipo', key: 'tipo_comprobante', width: 85 },
          { label: 'NÂ°', key: 'numero', width: 55, align: 'right' },
          { label: 'CAE', key: 'cae', width: 110 },
          { label: 'Venc.', key: 'cae_vencimiento', width: 70 },
          { label: 'Estado', key: 'estado', width: 70 },
          { label: 'Cliente', key: 'cliente', width: 120 },
          { label: 'Total $', key: 'total', width: 90, align: 'right', render: (r) => `$${fmtNum(r.total)}` }
        ],
        filas: rows,
        totales: {
          'Cantidad comprobantes': String(totales.cantidad),
          'Total facturado': `$${fmtNum(totales.total)}`
        }
      }, res);
    }

    res.json({ rows, totales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Ventas por cliente ────────────────────────────────────────────────────────

async function ventasPorCliente(req, res) {
  try {
    const { cliente_id, desde, hasta, estado, format } = req.query;

    const applyFilters = (b) => {
      if (cliente_id) b.where('v.cliente_id', cliente_id);
      if (estado) b.where('v.estado', estado);
      else b.whereNot('v.estado', 'borrador');
      if (desde) b.where('v.created_at', '>=', desde);
      if (hasta) b.where('v.created_at', '<=', hasta + ' 23:59:59');
    };

    const filas = await db('ventas as v')
      .leftJoin('clientes as c', 'v.cliente_id', 'c.id')
      .modify(applyFilters)
      .select(
        'v.id', 'v.numero', 'v.tipo_comprobante', 'v.estado', 'v.tipo_pago',
        'v.subtotal', 'v.descuento_monto', 'v.total', 'v.created_at',
        'c.nombre as cliente', 'c.cuit as cuit'
      )
      .orderBy('v.created_at', 'desc');

    const totalMonto = filas.reduce((s, r) => s + parseFloat(r.total || 0), 0);
    const cantidad = filas.length;

    const TIPO_LABEL = {
      remito: 'Remito', factura_interna: 'Comp. Interno',
      factura_a: 'Factura A', factura_b: 'Factura B',
      nota_debito_a: 'ND A', nota_debito_b: 'ND B',
      nota_credito_a: 'NC A', nota_credito_b: 'NC B'
    };

    if (format === 'pdf') {
      const clienteNombre = filas[0]?.cliente || `Cliente ${cliente_id}`;
      const subtitulo = [
        desde && `Desde: ${desde}`, hasta && `Hasta: ${hasta}`, estado && `Estado: ${estado}`
      ].filter(Boolean).join(' | ');
      return generarReporteTablaPDF({
        titulo: `Ventas — ${clienteNombre}`,
        subtitulo: subtitulo || undefined,
        columnas: [
          { key: 'numero',          label: 'N°',        width: 70,  render: (r) => String(r.numero).padStart(8, '0') },
          { key: 'created_at',      label: 'Fecha',     width: 65,  render: (r) => new Date(r.created_at).toLocaleDateString('es-AR') },
          { key: 'tipo_comprobante',label: 'Tipo',      width: 80,  render: (r) => TIPO_LABEL[r.tipo_comprobante] || r.tipo_comprobante },
          { key: 'estado',          label: 'Estado',    width: 70 },
          { key: 'tipo_pago',       label: 'Pago',      width: 70 },
          { key: 'total',           label: 'Total',     width: 80, align: 'right', render: (r) => `$${fmtNum(r.total)}` },
        ],
        filas,
        totales: {
          'Cantidad de comprobantes': cantidad,
          'Total': `$${fmtNum(totalMonto)}`
        }
      }, res);
    }

    if (format === 'csv') {
      const csv = toCSV(
        ['N°', 'Fecha', 'Cliente', 'CUIT', 'Tipo', 'Estado', 'Pago', 'Subtotal', 'Descuento', 'Total'],
        filas,
        ['numero', 'created_at', 'cliente', 'cuit', 'tipo_comprobante', 'estado', 'tipo_pago', 'subtotal', 'descuento_monto', 'total']
      );
      return sendCSV(res, 'ventas-por-cliente.csv', csv);
    }

    res.json({ data: filas, total: cantidad, total_monto: totalMonto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar reporte de ventas por cliente' });
  }
}

module.exports = {
  kpis,
  ventasPorPeriodo,
  rankingProductos,
  stockValorizado,
  rotacionStock,
  kardex,
  deudoresClientes,
  comprobantesAfip,
  ventasPorCliente
};

