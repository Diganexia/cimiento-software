/**
 * Genera docs/documentacion-tecnica.pdf
 * Uso: node docs/generate-pdf.js  (desde la raíz del monorepo)
 *      node generate-pdf.js       (desde docs/)
 */

const path = require('path');
const fs = require('fs');

const docsDir = __dirname;
const rootDir = path.resolve(docsDir, '..');
// pdfkit puede estar hoisteado en raíz (npm workspaces) o en server/node_modules
let PDFDocument;
try {
  PDFDocument = require(path.join(rootDir, 'node_modules', 'pdfkit'));
} catch {
  PDFDocument = require(path.join(rootDir, 'server', 'node_modules', 'pdfkit'));
}

const OUTPUT = path.join(docsDir, 'documentacion-tecnica.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
const stream = fs.createWriteStream(OUTPUT);
doc.pipe(stream);

// ─── Paleta ────────────────────────────────────────────────────────────────
const C = {
  primary: '#1d4ed8',
  primaryLight: '#dbeafe',
  accent: '#0f766e',
  gray900: '#111827',
  gray700: '#374151',
  gray500: '#6b7280',
  gray200: '#e5e7eb',
  gray100: '#f3f4f6',
  white: '#ffffff',
  red: '#dc2626',
  green: '#16a34a',
  orange: '#d97706',
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function header(txt, opts = {}) {
  const { color = C.primary, size = 16, mb = 8 } = opts;
  doc.moveDown(0.5).font('Helvetica-Bold').fontSize(size).fillColor(color).text(txt);
  if (opts.underline !== false) {
    const y = doc.y + 3;
    doc.moveTo(50, y).lineTo(545, y).strokeColor(C.gray200).lineWidth(1).stroke();
  }
  doc.moveDown(mb / 12).fillColor(C.gray900);
}

function subHeader(txt, opts = {}) {
  const { color = C.gray900, size = 12, mb = 4 } = opts;
  doc.moveDown(0.3).font('Helvetica-Bold').fontSize(size).fillColor(color).text(txt);
  doc.moveDown(mb / 12).fillColor(C.gray700);
}

function para(txt, opts = {}) {
  const { size = 10, color = C.gray700, indent = 0 } = opts;
  doc.font('Helvetica').fontSize(size).fillColor(color).text(txt, 50 + indent, doc.y, { width: 495 - indent, align: opts.align || 'left' });
  doc.moveDown(0.3);
}

function bullet(items, opts = {}) {
  const { indent = 0, size = 10, bullet: sym = '•' } = opts;
  items.forEach((item) => {
    doc.font('Helvetica').fontSize(size).fillColor(C.gray700)
      .text(`${sym}  ${item}`, 50 + indent, doc.y, { width: 495 - indent - 10 });
  });
  doc.moveDown(0.3);
}

function numberedList(items, opts = {}) {
  const { indent = 0, size = 10, startIndex = 1 } = opts;
  items.forEach((item, i) => {
    doc.font('Helvetica-Bold').fontSize(size).fillColor(C.primary)
      .text(`${startIndex + i}.`, 50 + indent, doc.y, { continued: true, width: 18 });
    doc.font('Helvetica').fillColor(C.gray700)
      .text(`  ${item}`, { width: 477 - indent });
  });
  doc.moveDown(0.3);
}

function codeBlock(lines, opts = {}) {
  const { title } = opts;
  const blockLines = Array.isArray(lines) ? lines : [lines];
  const h = blockLines.length * 14 + 16;
  checkPageBreak(h + 30);
  if (title) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.gray500).text(title, 50, doc.y);
    doc.moveDown(0.2);
  }
  const y0 = doc.y;
  doc.rect(50, y0, 495, h).fillColor(C.gray100).fill();
  doc.rect(50, y0, 3, h).fillColor(C.primary).fill();
  doc.fillColor(C.gray900).font('Courier').fontSize(8.5);
  blockLines.forEach((line, i) => {
    doc.text(line, 60, y0 + 8 + i * 14, { width: 480, lineBreak: false });
  });
  doc.y = y0 + h + 6;
  doc.moveDown(0.2);
}

function infoBox(txt, opts = {}) {
  const { color = C.primaryLight, border = C.primary, icon = 'ℹ' } = opts;
  checkPageBreak(50);
  const y0 = doc.y;
  doc.rect(50, y0, 495, 36).fillColor(color).fill();
  doc.rect(50, y0, 495, 36).strokeColor(border).lineWidth(0.5).stroke();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(border).text(`${icon}  ${txt}`, 58, y0 + 12, { width: 479 });
  doc.y = y0 + 44;
}

function warningBox(txt) {
  infoBox(txt, { color: '#fefce8', border: C.orange, icon: '⚠' });
}

function successBox(txt) {
  infoBox(txt, { color: '#f0fdf4', border: C.green, icon: '✓' });
}

function table(headers, rows, opts = {}) {
  const { colWidths } = opts;
  const totalW = 495;
  const cols = headers.length;
  const widths = colWidths || headers.map(() => Math.floor(totalW / cols));
  const rowH = 20;
  checkPageBreak(rowH * (rows.length + 2) + 20);

  // Header row
  let x = 50;
  doc.rect(50, doc.y, totalW, rowH).fillColor(C.primary).fill();
  headers.forEach((h, i) => {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
      .text(h, x + 4, doc.y - rowH + 6, { width: widths[i] - 8, lineBreak: false });
    x += widths[i];
  });
  doc.y += 2;

  // Data rows
  rows.forEach((row, ri) => {
    checkPageBreak(rowH + 5);
    const bg = ri % 2 === 0 ? C.white : C.gray100;
    doc.rect(50, doc.y, totalW, rowH).fillColor(bg).fill();
    doc.rect(50, doc.y, totalW, rowH).strokeColor(C.gray200).lineWidth(0.3).stroke();
    x = 50;
    row.forEach((cell, ci) => {
      doc.font('Helvetica').fontSize(9).fillColor(C.gray700)
        .text(String(cell), x + 4, doc.y - rowH + 6, { width: widths[ci] - 8, lineBreak: false });
      x += widths[ci];
    });
    doc.y += 2;
  });
  doc.moveDown(0.5);
}

function checkPageBreak(needed = 80) {
  if (doc.y + needed > 780) {
    doc.addPage();
  }
}

function sectionDivider(num, title) {
  checkPageBreak(50);
  doc.moveDown(0.8);
  const y0 = doc.y;
  doc.rect(50, y0, 495, 28).fillColor(C.primary).fill();
  doc.font('Helvetica-Bold').fontSize(13).fillColor(C.white)
    .text(`  ${num}.  ${title}`, 50, y0 + 7, { width: 495 });
  doc.y = y0 + 36;
  doc.moveDown(0.2);
}

function stepBox(num, title, desc) {
  checkPageBreak(60);
  const y0 = doc.y;
  doc.circle(62, y0 + 10, 10).fillColor(C.primary).fill();
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white).text(String(num), 57, y0 + 5, { width: 12, align: 'center', lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.primary).text(title, 80, y0 + 4, { width: 465 });
  doc.font('Helvetica').fontSize(10).fillColor(C.gray700).text(desc, 80, doc.y, { width: 465 });
  doc.moveDown(0.5);
}

// ═══════════════════════════════════════════════════════════════════════════
//  PORTADA
// ═══════════════════════════════════════════════════════════════════════════
doc.rect(0, 0, 595, 842).fillColor(C.primary).fill();

// Logo area
doc.rect(50, 80, 495, 120).fillColor('#1e3a8a').fill();
doc.rect(50, 80, 6, 120).fillColor(C.accent).fill();
doc.font('Helvetica-Bold').fontSize(36).fillColor(C.white).text('FERRETERÍA / CORRALÓN', 70, 110, { width: 470 });
doc.font('Helvetica').fontSize(18).fillColor('#93c5fd').text('Sistema de Gestión Integral', 70, 158);

// Subtitle block
doc.rect(50, 230, 495, 200).fillColor('#1e3a8a').fill();
doc.font('Helvetica-Bold').fontSize(16).fillColor(C.white).text('Documentación Técnica', 70, 250);
doc.font('Helvetica-Bold').fontSize(14).fillColor('#93c5fd').text('— Guía de Instalación y Configuración —', 70, 275);
doc.font('Helvetica').fontSize(11).fillColor(C.gray200).text([
  '',
  '  • Stack: Electron + React + Node.js + PostgreSQL embebido',
  '  • Dos instaladores: Servidor y Cliente',
  '  • Sin internet requerido — 100% red LAN',
  '  • Facturación electrónica AFIP (Factura A / B)',
].join('\n'), 70, 300, { width: 455 });

// Version footer
doc.rect(50, 460, 495, 50).fillColor('#0f2a6e').fill();
doc.font('Helvetica-Bold').fontSize(11).fillColor('#93c5fd').text('Versión 1.0.0', 70, 473);
doc.font('Helvetica').fontSize(10).fillColor(C.gray500).text('2026 — Todas las fases completadas (1–9)', 70, 490);

// Bottom bar
doc.rect(0, 780, 595, 62).fillColor('#0f172a').fill();
doc.font('Helvetica').fontSize(9).fillColor(C.gray500).text('Este documento es de uso interno del instalador. No distribuir.', 50, 800, { width: 495, align: 'center' });

doc.addPage();

// ═══════════════════════════════════════════════════════════════════════════
//  ÍNDICE
// ═══════════════════════════════════════════════════════════════════════════
header('Índice de contenidos', { size: 18 });
doc.moveDown(0.3);

const toc = [
  ['1', 'Requisitos del sistema', 3],
  ['2', 'Instalación del servidor', 4],
  ['3', 'Primera ejecución y configuración inicial', 6],
  ['4', 'Instalación de equipos cliente', 9],
  ['5', 'Configuración AFIP (facturación electrónica)', 11],
  ['6', 'Gestión de backup y restauración', 13],
  ['7', 'Arquitectura técnica', 15],
  ['8', 'API y endpoints', 17],
  ['9', 'Base de datos y tablas', 21],
  ['10', 'Roles y permisos', 23],
  ['11', 'Variables de entorno', 24],
  ['12', 'Resolución de problemas', 25],
];

toc.forEach(([num, title]) => {
  doc.font('Helvetica').fontSize(11).fillColor(C.gray700)
    .text(`${num}.  ${title}`, 65, doc.y, { continued: true, width: 380 });
  doc.font('Helvetica').fillColor(C.gray500).text('', { align: 'right', width: 100 });
  doc.moveDown(0.15);
  doc.moveTo(65, doc.y + 2).lineTo(545, doc.y + 2).strokeColor(C.gray200).lineWidth(0.5).stroke();
  doc.moveDown(0.25);
});

doc.addPage();

// ═══════════════════════════════════════════════════════════════════════════
//  1. REQUISITOS
// ═══════════════════════════════════════════════════════════════════════════
sectionDivider(1, 'Requisitos del sistema');

subHeader('Equipo Servidor (1 PC en la red)');
table(
  ['Componente', 'Mínimo', 'Recomendado'],
  [
    ['Sistema operativo', 'Windows 10 64-bit', 'Windows 10/11 64-bit'],
    ['Procesador', 'Intel Core i3 2 GHz', 'Intel Core i5 o superior'],
    ['RAM', '4 GB', '8 GB'],
    ['Disco', '500 MB libres', '2 GB libres (+ datos)'],
    ['Red', 'LAN 100 Mbps', 'LAN Gigabit'],
    ['Internet', 'Solo para AFIP (opcional)', 'Recomendado para AFIP'],
  ],
  { colWidths: [160, 167, 168] }
);

subHeader('Equipos Cliente (N PCs en la misma red)');
table(
  ['Componente', 'Mínimo'],
  [
    ['Sistema operativo', 'Windows 10 64-bit'],
    ['RAM', '2 GB'],
    ['Red', 'Acceso al servidor (mismo router/switch)'],
    ['Internet', 'No requerido'],
  ],
  { colWidths: [200, 295] }
);

infoBox('El servidor NO requiere instalación de PostgreSQL, Node.js ni ningún otro prerequisito. Todo está incluido en el instalador.');

// ═══════════════════════════════════════════════════════════════════════════
//  2. INSTALACIÓN DEL SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
sectionDivider(2, 'Instalación del servidor');

para('El instalador del servidor configura automáticamente la base de datos, el servidor web y la aplicación de escritorio en una sola PC que actuará como nodo central de la red.');

doc.moveDown(0.3);
subHeader('2.1  Ejecutar el instalador');

stepBox(1, 'Descargar el instalador',
  'Obtener el archivo "Corralon Servidor Setup.exe" del medio de distribución (USB, carpeta de red, etc.).');

stepBox(2, 'Ejecutar como administrador',
  'Hacer clic derecho sobre el archivo → "Ejecutar como administrador". Windows puede mostrar un aviso de seguridad — hacer clic en "Más información" → "Ejecutar de todas formas".');

stepBox(3, 'Completar el asistente de instalación',
  'Aceptar la licencia → elegir carpeta de instalación (por defecto: C:\\Program Files\\Corralon Servidor) → clic en "Instalar".');

stepBox(4, 'Esperar la instalación',
  'El instalador copiará todos los archivos. Duración aproximada: 2-5 minutos dependiendo del equipo.');

stepBox(5, 'Finalizar',
  'Dejar marcada la opción "Iniciar Corralon Servidor" y hacer clic en "Terminar".');

doc.moveDown(0.5);
subHeader('2.2  Primer arranque del servidor');

para('Al iniciar por primera vez, el sistema ejecuta una secuencia automática de inicialización:');
doc.moveDown(0.1);

const bootSteps = [
  'Aparece una pantalla de "Iniciando..." con barra de progreso.',
  'El sistema inicializa la base de datos PostgreSQL embebida (puerto 5433).',
  'Se crean automáticamente las tablas y los datos iniciales (seed).',
  'Se genera una contraseña segura aleatoria para la base de datos.',
  'Se genera un secreto JWT aleatorio para la autenticación.',
  'El servidor Express se inicia en el puerto 3001.',
  'La pantalla de arranque cierra y aparece la pantalla de login.',
];
numberedList(bootSteps);

warningBox('Este proceso puede tomar 30-60 segundos la primera vez. Las siguientes veces demora menos de 10 segundos.');

doc.moveDown(0.3);
subHeader('2.3  Acceder al sistema por primera vez');
para('Usar las credenciales iniciales:');
table(
  ['Campo', 'Valor'],
  [
    ['Usuario', 'admin'],
    ['Contraseña', 'admin1234'],
  ],
  { colWidths: [200, 295] }
);
warningBox('Cambiar la contraseña del administrador inmediatamente en Sistema → Usuarios → editar admin.');

doc.moveDown(0.3);
subHeader('2.4  Verificar la IP del servidor');
para('En el Dashboard, buscar el banner azul con la leyenda "IP del servidor: 192.168.X.X:3001". Anotar esta dirección — se necesitará para configurar los equipos cliente.');

infoBox('Si no aparece la IP, el equipo servidor no tiene red. Verificar la conexión al router/switch.');

// ═══════════════════════════════════════════════════════════════════════════
//  3. CONFIGURACIÓN INICIAL
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
sectionDivider(3, 'Primera ejecución y configuración inicial');

para('Antes de comenzar a usar el sistema en producción, completar los siguientes pasos de configuración.');

subHeader('3.1  Datos de la empresa');
numberedList([
  'Ir a Configuración (menú lateral) → tab "Empresa".',
  'Completar: Nombre del negocio, CUIT, dirección, teléfono, email.',
  'Hacer clic en "Guardar".',
  'Estos datos aparecerán en todos los PDFs generados (facturas, arqueos, reportes).',
]);

subHeader('3.2  Configurar depósitos');
numberedList([
  'Ir a Configuración → tab "Depósitos".',
  'El sistema viene con un depósito "Principal" por defecto.',
  'Agregar depósitos adicionales si se trabaja con múltiples almacenes.',
]);

subHeader('3.3  Configurar caja');
numberedList([
  'Ir a Configuración → tab "Cajas".',
  'El sistema viene con una "Caja Principal" por defecto.',
  'Agregar cajas adicionales si se necesitan (por ejemplo, una por caja registradora física).',
]);

subHeader('3.4  Configurar medios de pago');
numberedList([
  'Ir a Configuración → tab "Medios de pago".',
  'Los medios predefinidos son: Efectivo, Débito, Crédito, Transferencia.',
  'Agregar o modificar según las necesidades del negocio.',
]);

subHeader('3.5  Rubros y unidades de medida');
numberedList([
  'Ir a Configuración → tab "Rubros" para crear categorías de productos.',
  'Ir a Configuración → tab "Unidades" para verificar/agregar unidades (u, kg, m, m², L, etc.).',
]);

subHeader('3.6  Cargar el catálogo de productos');
numberedList([
  'Ir a Stock → Productos → botón "+ Nuevo producto".',
  'Completar: Código, Nombre, Rubro, Unidad, Precio de costo, Precio de venta, Stock mínimo.',
  'Guardar y repetir para todos los productos.',
  'Para el stock inicial: ir al producto → "Ajuste de stock" → ingresar la cantidad inicial con motivo "Stock inicial".',
]);

subHeader('3.7  Cargar proveedores');
numberedList([
  'Ir a Compras → Proveedores → "+ Nuevo proveedor".',
  'Completar: Nombre, CUIT/CUIL, dirección, teléfono.',
]);

subHeader('3.8  Cargar clientes');
numberedList([
  'Ir a Ventas → Clientes → "+ Nuevo cliente".',
  'Completar: Nombre/Razón social, CUIT/DNI, condición de IVA, datos de contacto.',
  'La condición de IVA determina el tipo de comprobante que se emite (A para Responsable Inscripto, B para el resto).',
]);

subHeader('3.9  Configurar usuarios adicionales');
numberedList([
  'Ir a Sistema → Usuarios → "+ Nuevo usuario".',
  'Asignar rol: Administrador, Vendedor o Repositor (o roles personalizados).',
  'El rol determina qué módulos y acciones puede realizar cada usuario.',
]);

doc.moveDown(0.3);
subHeader('3.10  Abrir la primera caja');
numberedList([
  'Ir a Tesorería → Caja.',
  'Hacer clic en "Abrir caja".',
  'Ingresar el saldo inicial de efectivo (fondo de caja).',
  'A partir de este momento se pueden registrar ventas.',
]);

successBox('Con estos pasos completados, el sistema está listo para operar en producción.');

// ═══════════════════════════════════════════════════════════════════════════
//  4. INSTALACIÓN CLIENTES
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
sectionDivider(4, 'Instalación de equipos cliente');

para('Cada PC adicional en la red (cajas, mostrador, depósito) necesita el instalador cliente. El cliente es solo la interfaz — toda la lógica y base de datos están en el servidor.');

subHeader('4.1  Prerequisitos del cliente');
bullet([
  'El servidor debe estar instalado, funcionando y accesible en la red.',
  'El equipo cliente debe estar en la misma red local (mismo router/switch).',
  'Tener a mano la IP del servidor (obtenida en el paso 2.4).',
]);

subHeader('4.2  Instalar el cliente');

stepBox(1, 'Ejecutar el instalador cliente',
  'Copiar "Corralon Cliente Setup.exe" al equipo cliente y ejecutarlo como administrador.');

stepBox(2, 'Completar el asistente',
  'Aceptar la licencia → elegir carpeta (por defecto: C:\\Program Files\\Corralon Cliente) → Instalar.');

stepBox(3, 'Primer inicio — Configurar IP del servidor',
  'Al abrir la aplicación por primera vez, aparece una pantalla "Conectar al servidor".');

stepBox(4, 'Ingresar la dirección del servidor',
  'En el campo "Dirección del servidor", ingresar la IP del servidor con el puerto:\n     Ejemplo: http://192.168.1.100:3001');

stepBox(5, 'Probar la conexión',
  'Hacer clic en "Probar conexión". Si el resultado es verde ("Conexión exitosa"), el cliente puede comunicarse con el servidor.');

stepBox(6, 'Conectar',
  'Hacer clic en "Conectar y continuar". Se guardará la configuración y se mostrará la pantalla de login.');

stepBox(7, 'Iniciar sesión',
  'Ingresar usuario y contraseña. Cada operario puede tener sus propias credenciales con el rol adecuado.');

doc.moveDown(0.3);
subHeader('4.3  Cambiar la IP del servidor');
para('Si el servidor cambia de IP (ej. se reemplazó el equipo), en el cliente ir a la pantalla de login → botón "Cambiar" → ingresar la nueva IP.');

infoBox('Consejo: configurar IP fija en el equipo servidor (en Windows: Panel de control → Redes → Adaptador → Propiedades TCP/IPv4) para evitar que la IP cambie al reiniciar el router.');

doc.moveDown(0.3);
subHeader('4.4  Múltiples clientes simultáneos');
para('Se pueden conectar tantos clientes como se necesite. Todos comparten la misma base de datos en el servidor. Las operaciones son en tiempo real — una venta registrada desde cualquier terminal es visible inmediatamente en las demás.');

table(
  ['Escenario', 'Recomendación'],
  [
    ['1 PC (todo en uno)', 'Instalar solo el servidor — tiene todo incluido'],
    ['2-5 PCs', 'Servidor en PC más potente + clientes en el resto'],
    ['Más de 5 PCs', 'Servidor en PC dedicada (no usarla como caja)'],
  ],
  { colWidths: [200, 295] }
);

// ═══════════════════════════════════════════════════════════════════════════
//  5. CONFIGURACIÓN AFIP
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
sectionDivider(5, 'Configuración AFIP (facturación electrónica)');

warningBox('Esta sección es opcional. Si no se requiere facturación electrónica, omitir y usar "Ticket" como tipo de comprobante.');

para('El sistema usa node-afip para comunicarse directamente con los Web Services de AFIP (WSFE/WSAA). Se requiere un certificado digital emitido por AFIP.');

subHeader('5.1  Obtener el certificado digital de AFIP');

numberedList([
  'Ingresar a https://auth.afip.gob.ar con clave fiscal nivel 3.',
  'Ir a "Servicios Administrativos" → "Administrador de Relaciones de Clave Fiscal".',
  'Generar una clave privada (archivo .key) y un certificado (archivo .crt).',
  'Solicitar la habilitación del servicio "Facturación electrónica" (wsfe) para ese certificado.',
  'Guardar los archivos .key y .crt en una carpeta segura del equipo servidor.',
], { indent: 0 });

subHeader('5.2  Configurar en el sistema');
numberedList([
  'En el sistema, ir a Configuración → tab "AFIP".',
  'Completar el CUIT del contribuyente.',
  'Ingresar la ruta completa al archivo de certificado (.crt).',
  'Ingresar la ruta completa al archivo de clave privada (.key).',
  'Hacer clic en "Guardar".',
  'Ir a la tab "Puntos de venta AFIP" y crear el punto de venta (número de 4 dígitos, ej: 0001).',
]);

codeBlock([
  'Ejemplo de rutas (Windows):',
  '  Certificado: C:\\afip\\certificado.crt',
  '  Clave:       C:\\afip\\clave_privada.key',
]);

subHeader('5.3  Probar la conexión con AFIP');
numberedList([
  'Crear una venta de prueba y seleccionar tipo "Factura B".',
  'Al confirmar, el sistema se comunicará con AFIP para obtener el CAE.',
  'Si la operación es exitosa, el CAE y fecha de vencimiento aparecen en el detalle de la venta.',
  'El PDF de la factura incluirá el código de barras del CAE.',
]);

infoBox('AFIP requiere conexión a internet. Si el servidor no tiene internet, las facturas fallarán. Se puede usar tipo "Ticket" sin internet.');

subHeader('5.4  Ambiente de homologación (pruebas)');
para('Para probar sin emitir comprobantes reales, node-afip soporta el ambiente de homologación de AFIP. Editar el archivo `server/.env` o la configuración interna del servicio y cambiar el modo a "homo".');

warningBox('No usar el ambiente de producción para pruebas — los CAEs emitidos son reales y tienen validez fiscal.');

// ═══════════════════════════════════════════════════════════════════════════
//  6. BACKUP
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
sectionDivider(6, 'Gestión de backup y restauración');

para('El sistema realiza backups automáticos diarios y permite backups manuales desde la interfaz. Los backups se almacenan en el equipo servidor.');

subHeader('6.1  Backup automático');
bullet([
  'El sistema hace un backup automático todos los días a las 02:00 AM.',
  'Se guardan en la carpeta de datos del usuario (AppData\\Roaming\\corralon-servidor\\backups).',
  'Se mantienen los últimos 30 días de backups. Los más antiguos se eliminan automáticamente.',
  'El formato es pg_dump comprimido (.dump) — eficiente en espacio.',
]);

subHeader('6.2  Backup manual');
numberedList([
  'Ir a Configuración (menú lateral) → Backup.',
  'Hacer clic en "Realizar backup ahora".',
  'El backup se genera en segundos y aparece en la lista con fecha y tamaño.',
]);

subHeader('6.3  Restaurar un backup');
numberedList([
  'Ir a Configuración → Backup.',
  'Buscar el backup a restaurar en la lista.',
  'Hacer clic en el ícono de restaurar (flecha).',
  'Confirmar el mensaje de advertencia — la restauración reemplaza TODOS los datos actuales.',
  'El sistema se reiniciará automáticamente después de la restauración.',
]);

warningBox('La restauración borra todos los datos actuales. Hacer un backup manual antes de restaurar si existe información reciente que no se quiere perder.');

subHeader('6.4  Copias externas (recomendado)');
para('Para protección adicional, copiar los archivos de backup a un dispositivo externo (USB, disco externo) o nube regularmente:');
bullet([
  'La carpeta de backups aparece en la pantalla de Backup del sistema.',
  'Copiar los archivos .dump a un USB o disco externo semanalmente.',
  'Guardar copias fuera del local (en caso de incendio, robo, etc.).',
]);

codeBlock([
  'Ruta de backups (Windows):',
  '  C:\\Users\\[Usuario]\\AppData\\Roaming\\corralon-servidor\\backups\\',
  '',
  'Archivos generados:',
  '  backup-2026-05-15T03-00-00.dump  (aprox. 1-5 MB)',
]);

subHeader('6.5  Transferir datos a otro servidor');
numberedList([
  'En el servidor original: hacer un backup manual desde la UI.',
  'Copiar el archivo .dump a un USB.',
  'Instalar el servidor en el nuevo equipo.',
  'En el nuevo servidor: ir a Configuración → Backup.',
  'Hacer clic en el botón para importar un backup externo y seleccionar el archivo .dump.',
  'El sistema restaurará todos los datos en el nuevo equipo.',
]);

// ═══════════════════════════════════════════════════════════════════════════
//  7. ARQUITECTURA
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
sectionDivider(7, 'Arquitectura técnica');

subHeader('7.1  Stack tecnológico');
table(
  ['Capa', 'Tecnología', 'Versión'],
  [
    ['Desktop client', 'Electron', '29'],
    ['Frontend framework', 'React', '18'],
    ['Build tool', 'Vite', '5'],
    ['CSS', 'TailwindCSS', '3'],
    ['Estado global', 'Zustand', '4'],
    ['Routing', 'React Router', '6'],
    ['HTTP client', 'Axios', '1.6'],
    ['Gráficos', 'Recharts', '2'],
    ['Backend', 'Node.js + Express', '4.18'],
    ['Query builder', 'Knex.js', '3'],
    ['Base de datos', 'PostgreSQL (embedded)', '15+'],
    ['Autenticación', 'JWT (jsonwebtoken)', '9'],
    ['Hash de contraseñas', 'bcryptjs', '2.4'],
    ['PDF', 'pdfkit', '0.15'],
    ['Facturación electrónica', 'node-afip', '1.0'],
  ],
  { colWidths: [180, 180, 135] }
);

subHeader('7.2  Diagrama de arquitectura');
codeBlock([
  '  Red LAN',
  '  ┌──────────────────────────────────┐    HTTP/REST    ┌─────────────────────┐',
  '  │  Corralon Servidor (1 PC)        │ ◄────────────► │  Corralon Cliente   │',
  '  │  Electron + React                │    :3001        │  Electron + React   │',
  '  │  Express (in-process)            │                 │  (N equipos)        │',
  '  │  PostgreSQL embebido (:5433)     │                 └─────────────────────┘',
  '  └──────────────────────────────────┘',
]);

subHeader('7.3  Detección de modo (servidor vs cliente)');
para('El modo se detecta en runtime por la presencia del archivo `server-mode.flag` en los recursos de Electron. Esta solución permite tener un único codebase y generar dos instaladores distintos.');

codeBlock([
  'function isServerMode() {',
  '  if (isDev) return process.env.SERVER_MODE === "true";',
  '  return fs.existsSync(path.join(process.resourcesPath, "server-mode.flag"));',
  '}',
], { title: 'electron/main.js' });

subHeader('7.4  Express in-process en Electron');
para('En el build servidor, Express se ejecuta directamente en el proceso principal de Electron (no como proceso hijo). Esto simplifica el empaquetado y evita la necesidad de un binario Node.js separado.');

subHeader('7.5  URL dinámica del servidor en el cliente');
para('El cliente usa ipcRenderer.sendSync() (síncrono) para obtener la URL del servidor al inicializar el módulo api.js, antes de cualquier llamada HTTP:');
codeBlock([
  'function resolveBaseURL() {',
  '  if (window.electronAPI) {',
  '    const url = window.electronAPI.getServerUrl();',
  '    if (url) return url.replace(/\\/$/, "") + "/api";',
  '  }',
  '  return import.meta.env.VITE_API_URL || "http://localhost:3001/api";',
  '}',
], { title: 'client/src/lib/api.js' });

// ═══════════════════════════════════════════════════════════════════════════
//  8. API
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
sectionDivider(8, 'API y endpoints');

para('Todos los endpoints (excepto /api/auth/login) requieren JWT en el header: Authorization: Bearer <token>.');

subHeader('8.1  Auth — /api/auth');
table(['Método', 'Ruta', 'Auth', 'Descripción'], [
  ['POST', '/login', 'No', '{username, password} → {token, usuario}'],
  ['GET', '/me', 'JWT', 'Usuario autenticado actual'],
], { colWidths: [60, 100, 50, 285] });

subHeader('8.2  Productos — /api/productos');
table(['Método', 'Ruta', 'Permiso', 'Descripción'], [
  ['GET', '/', 'productos.ver', 'Listado con filtros + paginación'],
  ['GET', '/:id', 'productos.ver', 'Detalle + stock por depósito'],
  ['POST', '/', 'productos.crear', 'Crear producto'],
  ['PUT', '/:id', 'productos.editar', 'Editar producto'],
  ['DELETE', '/:id', 'productos.eliminar', 'Baja lógica'],
], { colWidths: [60, 80, 130, 225] });

subHeader('8.3  Stock — /api/stock');
table(['Método', 'Ruta', 'Permiso', 'Descripción'], [
  ['GET', '/', 'stock.ver', 'Stock actual por producto×depósito'],
  ['GET', '/movimientos', 'stock.ver', 'Historial con filtros'],
  ['POST', '/transferencia', 'stock.transferir', 'Transferencia entre depósitos'],
  ['POST', '/ajuste', 'stock.ajustar', 'Ajuste manual de cantidad'],
], { colWidths: [60, 120, 130, 185] });

checkPageBreak(120);
subHeader('8.4  Ventas — /api/ventas');
table(['Método', 'Ruta', 'Descripción'], [
  ['GET', '/', 'Listado con filtros (estado, fecha, cliente)'],
  ['GET', '/:id', 'Detalle + ítems + info AFIP'],
  ['GET', '/:id/pdf', 'Genera y descarga PDF de la venta'],
  ['POST', '/', 'Crear venta (acepta confirmar:true)'],
  ['POST', '/:id/confirmar', 'Confirmar → descuenta stock, mueve caja, cuenta corriente'],
  ['POST', '/:id/anular', 'Anular → revierte stock'],
], { colWidths: [60, 120, 315] });

subHeader('8.5  Compras — /api/compras');
table(['Método', 'Ruta', 'Descripción'], [
  ['GET', '/', 'Listado de compras'],
  ['GET', '/:id', 'Detalle + ítems'],
  ['POST', '/', 'Crear borrador'],
  ['PUT', '/:id', 'Editar borrador'],
  ['POST', '/:id/confirmar', 'Confirmar → ingresa stock + cta cte proveedor'],
], { colWidths: [60, 120, 315] });

checkPageBreak(150);
subHeader('8.6  Cuentas corrientes — /api/cta-cte');
table(['Método', 'Ruta', 'Descripción'], [
  ['GET', '/clientes', 'Resumen clientes con saldo'],
  ['GET', '/clientes/:id', 'Movimientos + saldo de un cliente'],
  ['GET', '/clientes/:id/pdf', 'PDF estado de cuenta'],
  ['POST', '/clientes/cobro', 'Registrar cobro'],
  ['GET', '/proveedores', 'Resumen proveedores con saldo'],
  ['GET', '/proveedores/:id', 'Movimientos + saldo de un proveedor'],
  ['POST', '/proveedores/pago', 'Registrar pago'],
  ['GET', '/cuotas', 'Cuotas pendientes y vencidas'],
  ['PUT', '/cuotas/:id/pagar', 'Marcar cuota como pagada'],
], { colWidths: [60, 160, 275] });

subHeader('8.7  Tesorería — /api/cajas');
table(['Método', 'Ruta', 'Descripción'], [
  ['POST', '/abrir', 'Abrir nuevo arqueo con saldo inicial'],
  ['POST', '/cerrar', 'Cerrar arqueo con saldo declarado'],
  ['GET', '/arqueo-actual', 'Arqueo abierto + resumen por medio de pago'],
  ['GET', '/arqueos', 'Historial de arqueos'],
  ['GET', '/arqueos/:id/pdf', 'PDF del arqueo'],
  ['POST', '/movimiento-manual', 'Ingreso/egreso manual de caja'],
], { colWidths: [60, 140, 295] });

doc.addPage();
subHeader('8.8  Reportes — /api/reportes');
para('Todos los endpoints aceptan ?format=pdf y ?format=csv para exportación directa.');
table(['Método', 'Ruta', 'Descripción'], [
  ['GET', '/kpis', 'Dashboard: ventas hoy, saldo caja, deudores, stock bajo mínimo'],
  ['GET', '/ventas-periodo', 'Ventas agrupadas por día/semana/mes con filtros de fecha'],
  ['GET', '/ranking-productos', 'Top N productos más vendidos en un período'],
  ['GET', '/stock-valorizado', 'Stock actual valorizado a precio costo y venta'],
  ['GET', '/rotacion-stock', 'Productos sin movimiento en los últimos N días'],
  ['GET', '/kardex/:productoId', 'Historial completo de movimientos de un producto'],
  ['GET', '/deudores-clientes', 'Clientes con saldo deudor y monto adeudado'],
  ['GET', '/comprobantes-afip', 'Comprobantes electrónicos emitidos con CAE'],
], { colWidths: [60, 160, 275] });

subHeader('8.9  Configuración — /api/configuracion');
table(['Método', 'Ruta', 'Descripción'], [
  ['GET/PUT', '/empresa', 'Datos del negocio (persiste en empresa.json)'],
  ['GET/POST/PUT/DELETE', '/puntos-venta', 'CRUD puntos de venta AFIP'],
  ['GET/POST/PUT/DELETE', '/rubros', 'CRUD rubros/categorías'],
  ['GET/POST/PUT/DELETE', '/unidades', 'CRUD unidades de medida'],
  ['GET/POST/PUT/DELETE', '/medios-pago', 'CRUD medios de pago'],
  ['GET/POST/PUT/DELETE', '/depositos', 'CRUD depósitos'],
  ['GET/POST/PUT', '/cajas', 'Gestión de cajas registradoras'],
], { colWidths: [100, 130, 265] });

// ═══════════════════════════════════════════════════════════════════════════
//  9. BASE DE DATOS
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
sectionDivider(9, 'Base de datos y tablas');

subHeader('9.1  Relaciones por módulo');
codeBlock([
  '[Auth]        roles → usuarios',
  '[Catálogo]    rubros (árbol) → productos ← proveedores',
  '              productos → unidades_medida',
  '[Stock]       depositos ← stock_por_deposito → productos',
  '              movimientos_stock → productos, depositos, usuarios',
  '[Ventas]      clientes → ventas → ventas_items → productos',
  '[Compras]     proveedores → compras → compras_items → productos',
  '[Tesorería]   cajas → arqueos → movimientos_caja ← medios_pago',
  '[Cta. Cte.]   cuenta_corriente_clientes / proveedores (saldo running)',
  '              cuotas_cliente → ventas',
  '[AFIP]        puntos_venta_afip → comprobantes_afip → ventas',
]);

subHeader('9.2  Tablas');
table(['Tabla', 'Módulo', 'Descripción'], [
  ['roles', 'Auth', 'Roles con JSON de permisos'],
  ['usuarios', 'Auth', 'Usuarios del sistema'],
  ['unidades_medida', 'Catálogo', 'Unidades (u, kg, m, m², L...)'],
  ['rubros', 'Catálogo', 'Categorías en árbol (self-join padre_id)'],
  ['proveedores', 'Catálogo', 'Proveedores con CUIT'],
  ['productos', 'Catálogo', 'Catálogo con precios y stock mínimo'],
  ['depositos', 'Stock', 'Almacenes/depósitos físicos'],
  ['stock_por_deposito', 'Stock', 'Cantidad actual por producto×depósito'],
  ['movimientos_stock', 'Stock', 'Historial con cantidad anterior/posterior'],
  ['clientes', 'Ventas', 'Clientes con tipo IVA'],
  ['ventas', 'Ventas', 'Cabecera de ventas (estado, tipo comprobante)'],
  ['ventas_items', 'Ventas', 'Líneas de cada venta'],
  ['compras', 'Compras', 'Cabecera de compras'],
  ['compras_items', 'Compras', 'Líneas de cada compra'],
  ['medios_pago', 'Tesorería', 'Efectivo, débito, crédito, transferencia...'],
  ['cajas', 'Tesorería', 'Cajas registradoras'],
  ['arqueos', 'Tesorería', 'Turnos/arqueos con apertura y cierre'],
  ['movimientos_caja', 'Tesorería', 'Movimientos del arqueo con medio de pago'],
  ['cuenta_corriente_clientes', 'Cta. Cte.', 'Débitos/créditos con saldo running'],
  ['cuotas_cliente', 'Cta. Cte.', 'Cuotas generadas al confirmar venta'],
  ['cuenta_corriente_proveedores', 'Cta. Cte.', 'Débitos/créditos proveedores'],
  ['puntos_venta_afip', 'AFIP', 'Puntos de venta habilitados en AFIP'],
  ['comprobantes_afip', 'AFIP', 'Facturas electrónicas con CAE y vencimiento'],
], { colWidths: [170, 100, 225] });

// ═══════════════════════════════════════════════════════════════════════════
//  10. PERMISOS
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
sectionDivider(10, 'Roles y permisos');

subHeader('10.1  Roles por defecto');
table(['Rol', 'Descripción', 'Permisos'], [
  ['Administrador', 'Control total', '{ all: true } — bypasea toda verificación'],
  ['Vendedor', 'Operaciones de ventas', 'Ver stock, crear ventas, cobros, clientes'],
  ['Repositor', 'Gestión de mercadería', 'Ver/ajustar stock, recibir compras'],
], { colWidths: [110, 150, 235] });

subHeader('10.2  Módulos y acciones');
table(['Módulo', 'Acciones disponibles'], [
  ['productos', 'ver, crear, editar, eliminar'],
  ['stock', 'ver, ajustar, transferir, inventario'],
  ['ventas', 'ver, crear, anular'],
  ['compras', 'ver, crear, confirmar'],
  ['clientes', 'ver, crear, editar'],
  ['proveedores', 'ver, crear, editar'],
  ['caja', 'abrir, cerrar, ver_movimientos'],
  ['cta_cte', 'ver, cobrar, pagar'],
  ['usuarios', 'ver, crear, editar'],
  ['reportes', 'ver'],
  ['configuracion', 'ver, editar'],
], { colWidths: [140, 355] });

para('Los permisos se almacenan como JSON en la columna roles.permisos. El middleware authorize(modulo, accion) los verifica en cada endpoint.');

// ═══════════════════════════════════════════════════════════════════════════
//  11. VARIABLES DE ENTORNO
// ═══════════════════════════════════════════════════════════════════════════
checkPageBreak(200);
sectionDivider(11, 'Variables de entorno');

para('En desarrollo: server/.env. En producción (build servidor): generadas automáticamente en userData/app-config.json.');

table(['Variable', 'Descripción', 'Default'], [
  ['DB_HOST', 'Host PostgreSQL', '127.0.0.1'],
  ['DB_PORT', 'Puerto PostgreSQL', '5433 (embedded)'],
  ['DB_NAME', 'Base de datos', 'corralon'],
  ['DB_USER', 'Usuario PostgreSQL', 'corralon'],
  ['DB_PASS', 'Contraseña (auto-generada)', '—'],
  ['DB_SSL', 'Habilitar SSL', 'false'],
  ['JWT_SECRET', 'Secreto JWT (auto-generado)', '—'],
  ['PORT', 'Puerto Express', '3001'],
  ['ALLOWED_ORIGINS', 'Orígenes CORS', '* (LAN)'],
  ['AFIP_CUIT', 'CUIT para AFIP', '—'],
  ['AFIP_CERT_PATH', 'Ruta certificado X.509', '—'],
  ['AFIP_KEY_PATH', 'Ruta clave privada', '—'],
], { colWidths: [140, 200, 155] });

// ═══════════════════════════════════════════════════════════════════════════
//  12. RESOLUCIÓN DE PROBLEMAS
// ═══════════════════════════════════════════════════════════════════════════
doc.addPage();
sectionDivider(12, 'Resolución de problemas');

subHeader('La pantalla de inicio no cierra / "Iniciando..." se congela');
bullet([
  'El proceso de PostgreSQL puede haber quedado colgado de una sesión anterior.',
  'Solución: abrir Administrador de tareas → buscar procesos "postgres" → terminarlos → reiniciar la app.',
  'Si persiste: ir a AppData\\Roaming\\corralon-servidor\\data y eliminar el archivo postmaster.pid.',
]);

subHeader('El cliente no puede conectar al servidor');
bullet([
  'Verificar que el servidor esté abierto y haya completado el arranque.',
  'Verificar que ambos equipos estén en la misma red (mismo router).',
  'Verificar que el firewall de Windows permita el puerto 3001 en el servidor.',
  'Probar hacer ping desde el cliente al servidor: Win+R → cmd → ping 192.168.X.X',
  'En el servidor: Panel de control → Windows Defender Firewall → Reglas de entrada → Nueva regla → Puerto 3001.',
]);

codeBlock([
  '# Agregar regla de firewall (ejecutar como administrador en el servidor):',
  'netsh advfirewall firewall add rule name="Corralon" dir=in action=allow protocol=TCP localport=3001',
], { title: 'CMD (servidor)' });

subHeader('Error al generar facturas AFIP');
bullet([
  'Verificar que el servidor tenga acceso a internet.',
  'Verificar que el CUIT, certificado y clave privada estén correctamente configurados.',
  'El certificado tiene vencimiento — verificar su vigencia en el portal de AFIP.',
  'Para pruebas sin AFIP: usar tipo de comprobante "Ticket" (no requiere internet ni certificado).',
]);

subHeader('La base de datos no inicia');
bullet([
  'Verificar que el disco no esté lleno (PostgreSQL necesita espacio para escribir logs y WAL).',
  'Verificar permisos: la carpeta AppData\\Roaming\\corralon-servidor debe ser escribible.',
  'Revisar el log en AppData\\Roaming\\corralon-servidor\\data\\pg_log\\',
]);

subHeader('Rendimiento lento con muchos datos');
bullet([
  'Ejecutar VACUUM ANALYZE en la base de datos periódicamente.',
  'Considerar archivar ventas antiguas (más de 1 año) si el volumen es muy alto.',
  'Aumentar la RAM del servidor si tiene menos de 4 GB.',
]);

subHeader('Restaurar desde backup falla');
bullet([
  'El archivo .dump debe ser el generado por esta versión del sistema.',
  'No interrumpir el proceso de restauración — puede dejar la base de datos en estado inconsistente.',
  'Si falla: cerrar la app, renombrar la carpeta "data" en AppData, reiniciar (se creará una nueva BD vacía), restaurar nuevamente.',
]);

subHeader('Cambiar el equipo servidor');
numberedList([
  'Hacer backup manual desde la UI en el servidor original.',
  'Copiar el archivo .dump a un USB.',
  'Instalar el servidor en el nuevo equipo.',
  'En el nuevo servidor, ir a Configuración → Backup y restaurar el backup.',
  'Actualizar la IP en todos los equipos cliente (pantalla de login → "Cambiar").',
]);

doc.moveDown(1);
infoBox('Para soporte técnico, contactar al desarrollador con el archivo de log ubicado en AppData\\Roaming\\corralon-servidor\\logs\\');

// ─── Pie de página en todas las páginas ───────────────────────────────────
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  doc.font('Helvetica').fontSize(8).fillColor(C.gray500)
    .text(
      `Ferretería / Corralón — Sistema de Gestión v1.0.0  |  Página ${i + 1} de ${range.count}`,
      50, 820, { width: 495, align: 'center' }
    );
}

doc.end();

stream.on('finish', () => {
  console.log(`\n✓ PDF generado: ${OUTPUT}`);
  const stat = fs.statSync(OUTPUT);
  console.log(`  Tamaño: ${(stat.size / 1024).toFixed(1)} KB`);
});

stream.on('error', (err) => {
  console.error('Error al generar PDF:', err.message);
  process.exit(1);
});
