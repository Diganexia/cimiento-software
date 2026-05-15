const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const EMPRESA_PATH = path.join(__dirname, '../config/empresa.json');

const empresa = () => {
  try {
    if (fs.existsSync(EMPRESA_PATH)) {
      return JSON.parse(fs.readFileSync(EMPRESA_PATH, 'utf-8'));
    }
  } catch (_) {}
  return {
    nombre: process.env.EMPRESA_NOMBRE || 'Ferretería / Corralón',
    cuit: process.env.EMPRESA_CUIT || '',
    direccion: process.env.EMPRESA_DIRECCION || '',
    telefono: process.env.EMPRESA_TELEFONO || '',
    ingresosBrutos: process.env.EMPRESA_IIBB || '',
    inicioActividades: process.env.EMPRESA_INICIO || ''
  };
};

const TIPO_LABEL = {
  remito: 'REMITO',
  factura_interna: 'COMPROBANTE INTERNO',
  factura_a: 'FACTURA A',
  factura_b: 'FACTURA B'
};

function fmt(n) {
  return parseFloat(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generarVentaPDF(venta, items, cliente, comprobante, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="venta-${venta.numero}.pdf"`);
  doc.pipe(res);

  const emp = empresa();
  const label = TIPO_LABEL[venta.tipo_comprobante] || 'COMPROBANTE';

  // Header
  doc.fontSize(16).font('Helvetica-Bold').text(emp.nombre, 50, 50);
  doc.fontSize(9).font('Helvetica').fillColor('#555');
  if (emp.cuit) doc.text(`CUIT: ${emp.cuit}`);
  if (emp.direccion) doc.text(emp.direccion);
  if (emp.telefono) doc.text(`Tel: ${emp.telefono}`);

  // Tipo + número
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#000')
    .text(label, 350, 50, { align: 'right', width: 200 });
  doc.fontSize(11).font('Helvetica')
    .text(`N° ${String(venta.numero).padStart(8, '0')}`, 350, 80, { align: 'right', width: 200 });

  const fecha = venta.created_at
    ? new Date(venta.created_at).toLocaleDateString('es-AR')
    : new Date().toLocaleDateString('es-AR');
  doc.text(`Fecha: ${fecha}`, 350, 95, { align: 'right', width: 200 });

  // Line separator
  doc.moveTo(50, 130).lineTo(545, 130).strokeColor('#ccc').stroke();

  // Client info
  let y = 145;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000').text('CLIENTE', 50, y);
  doc.font('Helvetica').fillColor('#333');
  if (cliente) {
    doc.text(cliente.nombre || cliente.razon_social || 'Sin nombre', 50, y + 12);
    if (cliente.cuit) doc.text(`CUIT: ${cliente.cuit}`, 50, y + 24);
    if (cliente.direccion) doc.text(cliente.direccion, 50, y + 36);
  } else {
    doc.text('Consumidor final', 50, y + 12);
  }

  doc.text(`Condición IVA: ${venta.tipo_comprobante === 'factura_a' ? 'Responsable Inscripto' : 'Consumidor Final'}`, 350, y + 12, { width: 200, align: 'right' });

  // Items table header
  y = 210;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').stroke();
  y += 8;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#555');
  doc.text('Cód', 50, y, { width: 60 });
  doc.text('Descripción', 115, y, { width: 200 });
  doc.text('Cant', 320, y, { width: 50, align: 'right' });
  doc.text('Precio Unit.', 375, y, { width: 80, align: 'right' });
  doc.text('Subtotal', 460, y, { width: 85, align: 'right' });
  y += 12;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').stroke();
  y += 6;

  doc.font('Helvetica').fillColor('#000');
  for (const item of items) {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    doc.fontSize(8);
    doc.text(item.codigo || '', 50, y, { width: 60 });
    doc.text(item.producto || item.nombre || '', 115, y, { width: 200 });
    doc.text(fmt(item.cantidad), 320, y, { width: 50, align: 'right' });
    doc.text(`$${fmt(item.precio_unitario)}`, 375, y, { width: 80, align: 'right' });
    doc.text(`$${fmt(item.subtotal)}`, 460, y, { width: 85, align: 'right' });
    y += 14;
  }

  y += 6;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').stroke();
  y += 10;

  // Totals
  const colL = 380, colR = 460, colW = 85;
  doc.font('Helvetica').fontSize(9);
  doc.text('Subtotal:', colL, y, { width: colR - colL });
  doc.text(`$${fmt(venta.subtotal)}`, colR, y, { width: colW, align: 'right' });

  if (parseFloat(venta.descuento_monto) > 0) {
    y += 14;
    doc.text(`Descuento (${fmt(venta.descuento_porcentaje)}%):`, colL, y, { width: colR - colL });
    doc.text(`-$${fmt(venta.descuento_monto)}`, colR, y, { width: colW, align: 'right' });
  }

  y += 16;
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('TOTAL:', colL, y, { width: colR - colL });
  doc.text(`$${fmt(venta.total)}`, colR, y, { width: colW, align: 'right' });

  // CAE block (AFIP)
  if (comprobante?.cae) {
    y += 40;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
    doc.text('COMPROBANTE ELECTRÓNICO', 50, y);
    y += 12;
    doc.font('Helvetica').fontSize(8).fillColor('#333');
    doc.text(`CAE: ${comprobante.cae}`, 50, y);
    doc.text(`Vencimiento CAE: ${comprobante.cae_vencimiento}`, 200, y);

    // Simple text barcode representation
    y += 14;
    const barcode = `${process.env.AFIP_CUIT || ''}${String(venta.tipo_comprobante === 'factura_a' ? '01' : '06').padStart(3, '0')}${String(comprobante.punto_venta || 1).padStart(5, '0')}${comprobante.cae}${comprobante.cae_vencimiento?.replace(/-/g, '')}`;
    doc.fontSize(7).text(`Código de barras: ${barcode}`, 50, y, { width: 495 });
  }

  // Footer
  doc.fontSize(7).fillColor('#999')
    .text('Documento no válido como factura', 50, 800, { align: 'center', width: 495 });

  doc.end();
}

function generarEstadoCuentaPDF({ entidad, movimientos, saldo, tipo }, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const emp = empresa();
  const esCliente = tipo === 'cliente';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="cta-cte-${entidad.id}.pdf"`);
  doc.pipe(res);

  // Header empresa
  doc.fontSize(14).font('Helvetica-Bold').text(emp.nombre, 50, 50);
  doc.fontSize(8).font('Helvetica').fillColor('#555');
  if (emp.cuit) doc.text(`CUIT: ${emp.cuit}`);
  if (emp.direccion) doc.text(emp.direccion);

  // Title
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
    .text(`Estado de Cuenta — ${esCliente ? 'Cliente' : 'Proveedor'}`, 50, 100);
  doc.fontSize(10).font('Helvetica').fillColor('#333')
    .text(entidad.nombre || entidad.razon_social, 50, 118);
  if (entidad.cuit) doc.text(`CUIT: ${entidad.cuit}`, 50, 130);

  const fechaImpresion = new Date().toLocaleDateString('es-AR');
  doc.text(`Impreso: ${fechaImpresion}`, 400, 100, { align: 'right', width: 145 });

  doc.moveTo(50, 148).lineTo(545, 148).strokeColor('#ccc').stroke();

  // Table header
  let y = 162;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#555');
  doc.text('Fecha', 50, y, { width: 70 });
  doc.text('Descripción', 125, y, { width: 235 });
  doc.text('Debe', 365, y, { width: 55, align: 'right' });
  doc.text('Haber', 425, y, { width: 55, align: 'right' });
  doc.text('Saldo', 485, y, { width: 60, align: 'right' });
  y += 12;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').stroke();
  y += 6;

  doc.font('Helvetica').fillColor('#000').fontSize(8);

  for (const mov of movimientos) {
    if (y > 740) { doc.addPage(); y = 50; }
    const fecha = mov.created_at ? new Date(mov.created_at).toLocaleDateString('es-AR') : '';
    const debe  = mov.tipo === 'debito'  ? `$${fmt(mov.monto)}` : '';
    const haber = mov.tipo === 'credito' ? `$${fmt(mov.monto)}` : '';

    doc.text(fecha, 50, y, { width: 70 });
    doc.text((mov.descripcion || '').slice(0, 60), 125, y, { width: 235 });
    doc.fillColor(mov.tipo === 'debito' ? '#b91c1c' : '#555').text(debe,  365, y, { width: 55, align: 'right' });
    doc.fillColor(mov.tipo === 'credito' ? '#15803d' : '#555').text(haber, 425, y, { width: 55, align: 'right' });
    doc.fillColor('#000').text(`$${fmt(mov.saldo_posterior)}`, 485, y, { width: 60, align: 'right' });
    y += 13;
  }

  y += 8;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').stroke();
  y += 10;

  const saldoColor = parseFloat(saldo) > 0 ? '#b91c1c' : '#15803d';
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text('Saldo actual:', 380, y);
  doc.fillColor(saldoColor).text(`$${fmt(saldo)}`, 485, y, { width: 60, align: 'right' });

  doc.fontSize(7).fillColor('#999')
    .text(parseFloat(saldo) > 0 ? 'Saldo deudor' : 'Saldo acreedor / sin deuda', 50, 810, { align: 'center', width: 495 });

  doc.end();
}

function generarArqueoPDF({ arqueo, movimientos, resumen, ingresos, egresos, saldo_calculado }, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const emp = empresa();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="arqueo-${arqueo.id}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(14).font('Helvetica-Bold').text(emp.nombre, 50, 50);
  doc.fontSize(8).font('Helvetica').fillColor('#555');
  if (emp.cuit) doc.text(`CUIT: ${emp.cuit}`);

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('RESUMEN DE CAJA', 350, 50, { align: 'right', width: 195 });
  doc.fontSize(9).font('Helvetica').fillColor('#333')
    .text(`Caja: ${arqueo.caja}`, 350, 72, { align: 'right', width: 195 })
    .text(`Operador: ${arqueo.usuario_apertura}`, 350, 84, { align: 'right', width: 195 });

  const fmtDate = (d) => d ? new Date(d).toLocaleString('es-AR') : '—';
  doc.text(`Apertura: ${fmtDate(arqueo.abierto_at)}`, 350, 96, { align: 'right', width: 195 });
  if (arqueo.cerrado_at) doc.text(`Cierre: ${fmtDate(arqueo.cerrado_at)}`, 350, 108, { align: 'right', width: 195 });

  doc.moveTo(50, 128).lineTo(545, 128).strokeColor('#ccc').stroke();

  // Saldo inicial
  let y = 142;
  doc.fontSize(9).font('Helvetica').fillColor('#555').text('Saldo inicial:', 50, y);
  doc.font('Helvetica-Bold').fillColor('#000').text(`$${fmt(arqueo.saldo_inicial)}`, 200, y, { align: 'left' });

  // Summary table
  y += 24;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#555');
  doc.text('Medio de pago', 50, y, { width: 160 });
  doc.text('Ingresos', 215, y, { width: 90, align: 'right' });
  doc.text('Egresos', 310, y, { width: 90, align: 'right' });
  doc.text('Neto', 405, y, { width: 90, align: 'right' });
  y += 12;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').stroke();
  y += 6;

  doc.font('Helvetica').fillColor('#000').fontSize(8);
  for (const r of resumen) {
    doc.text(r.medio_pago, 50, y, { width: 160 });
    doc.fillColor('#15803d').text(`$${fmt(r.ingresos)}`, 215, y, { width: 90, align: 'right' });
    doc.fillColor('#b91c1c').text(r.egresos > 0 ? `-$${fmt(r.egresos)}` : '—', 310, y, { width: 90, align: 'right' });
    doc.fillColor(r.neto >= 0 ? '#000' : '#b91c1c').text(`$${fmt(r.neto)}`, 405, y, { width: 90, align: 'right' });
    y += 13;
  }

  y += 4;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').stroke();
  y += 10;

  // Totals
  doc.font('Helvetica').fontSize(9).fillColor('#555');
  doc.text('Total ingresos:', 50, y); doc.fillColor('#15803d').text(`$${fmt(ingresos)}`, 200, y);
  y += 14;
  doc.fillColor('#555').text('Total egresos:', 50, y); doc.fillColor('#b91c1c').text(`$${fmt(egresos)}`, 200, y);
  y += 14;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text('Saldo calculado:', 50, y);
  doc.text(`$${fmt(saldo_calculado)}`, 200, y);

  if (arqueo.estado === 'cerrado') {
    y += 20;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ccc').stroke();
    y += 12;
    doc.font('Helvetica').fontSize(9).fillColor('#555');
    doc.text('Saldo declarado:', 50, y); doc.fillColor('#000').text(`$${fmt(arqueo.saldo_declarado_cierre)}`, 200, y);
    y += 14;
    const dif = parseFloat(arqueo.diferencia_cierre || 0);
    doc.fillColor('#555').text('Diferencia:', 50, y);
    doc.fillColor(Math.abs(dif) < 0.01 ? '#15803d' : '#b91c1c').text(`$${fmt(dif)}`, 200, y);
    if (arqueo.usuario_cierre) {
      y += 14;
      doc.fillColor('#555').text(`Cerrado por: ${arqueo.usuario_cierre}`, 50, y);
    }
  }

  // Movements detail
  y += 30;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').stroke();
  y += 10;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#555').text('DETALLE DE MOVIMIENTOS', 50, y);
  y += 14;
  doc.text('Hora', 50, y, { width: 60 });
  doc.text('Concepto', 115, y, { width: 155 });
  doc.text('Medio', 275, y, { width: 100 });
  doc.text('Ingreso', 380, y, { width: 75, align: 'right' });
  doc.text('Egreso', 460, y, { width: 75, align: 'right' });
  y += 11;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').stroke();
  y += 5;

  doc.font('Helvetica').fillColor('#000').fontSize(7.5);
  for (const m of movimientos) {
    if (y > 760) { doc.addPage(); y = 50; }
    const hora = m.created_at ? new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
    const desc = (m.descripcion || m.concepto || '').slice(0, 35);
    doc.text(hora, 50, y, { width: 60 });
    doc.text(desc, 115, y, { width: 155 });
    doc.text(m.medio_pago || '', 275, y, { width: 100 });
    doc.fillColor('#15803d').text(m.tipo === 'ingreso' ? `$${fmt(m.monto)}` : '', 380, y, { width: 75, align: 'right' });
    doc.fillColor('#b91c1c').text(m.tipo === 'egreso'  ? `$${fmt(m.monto)}` : '', 460, y, { width: 75, align: 'right' });
    doc.fillColor('#000');
    y += 12;
  }

  doc.end();
}

// ── Reporte genérico de tabla ─────────────────────────────────────────────────

function generarReporteTablaPDF({ titulo, subtitulo, columnas, filas, totales, landscape = false }, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: landscape ? 'landscape' : 'portrait' });
  const emp = empresa();

  res.setHeader('Content-Type', 'application/pdf');
  const slug = titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  res.setHeader('Content-Disposition', `inline; filename="${slug}.pdf"`);
  doc.pipe(res);

  const pageW = landscape ? 752 : 515;

  // Header
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text(emp.nombre, 40, 30);
  doc.fontSize(8).font('Helvetica').fillColor('#777')
    .text(`Generado: ${new Date().toLocaleString('es-AR')}`, 40, 44);

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text(titulo, 40, 62);
  let headerBottom = 80;
  if (subtitulo) {
    doc.fontSize(8).font('Helvetica').fillColor('#555').text(subtitulo, 40, 80);
    headerBottom = 92;
  }

  doc.moveTo(40, headerBottom + 4).lineTo(40 + pageW, headerBottom + 4).strokeColor('#ccc').stroke();

  const totalColW = columnas.reduce((a, c) => a + (c.width || 80), 0);
  const scale = Math.min(1, pageW / totalColW);

  let y = headerBottom + 14;

  // Column headers
  let x = 40;
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#555');
  for (const col of columnas) {
    const w = (col.width || 80) * scale;
    doc.text(col.label, x, y, { width: w, align: col.align || 'left' });
    x += w;
  }
  y += 12;
  doc.moveTo(40, y).lineTo(40 + pageW, y).strokeColor('#ccc').stroke();
  y += 5;

  const pageBreakY = landscape ? 540 : 760;

  const addPageHeaders = () => {
    doc.addPage({ layout: landscape ? 'landscape' : 'portrait' });
    y = 40;
    x = 40;
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#555');
    for (const col of columnas) {
      const w = (col.width || 80) * scale;
      doc.text(col.label, x, y, { width: w, align: col.align || 'left' });
      x += w;
    }
    y += 12;
    doc.moveTo(40, y).lineTo(40 + pageW, y).strokeColor('#ccc').stroke();
    y += 5;
  };

  // Rows
  doc.font('Helvetica').fillColor('#000').fontSize(7.5);
  for (const row of filas) {
    if (y > pageBreakY) addPageHeaders();
    x = 40;
    for (const col of columnas) {
      const w = (col.width || 80) * scale;
      const val = col.render ? col.render(row) : String(row[col.key] ?? '');
      doc.text(val, x, y, { width: w, align: col.align || 'left' });
      x += w;
    }
    y += 12;
  }

  // Totales
  if (totales && Object.keys(totales).length) {
    if (y > pageBreakY - 40) addPageHeaders();
    y += 6;
    doc.moveTo(40, y).lineTo(40 + pageW, y).strokeColor('#ccc').stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
    for (const [label, value] of Object.entries(totales)) {
      doc.text(`${label}: `, 40, y);
      doc.text(value, 200, y);
      y += 14;
    }
  }

  if (!filas.length) {
    doc.font('Helvetica').fontSize(9).fillColor('#999').text('Sin datos para mostrar', 40, y + 10, { align: 'center', width: pageW });
  }

  doc.end();
}

module.exports = { generarVentaPDF, generarEstadoCuentaPDF, generarArqueoPDF, generarReporteTablaPDF };
