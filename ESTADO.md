# Estado del Proyecto — Ferretería Software

> Actualizado el 2026-05-19.  
> Repo: https://github.com/Diganexia/ferreteria-software

---

## Stack y arquitectura

- **Monorepo** con npm workspaces: `/client` (Electron + React + Vite) y `/server` (Node + Express)
- **Base de datos**: PostgreSQL portable vía `embedded-postgres` (puerto 5433), sin instalación manual
- **Auth**: JWT, expira 8h, guardado en localStorage con key `ferreteria_token`
- **PDF**: `pdfkit` (MIT, hoisted en raíz de node_modules por workspaces)
- **AFIP**: `node-afip` directo contra WSFE/WSAA — sin TusFacturas ni similares
- **UI**: React + Tailwind + Recharts
- **Dos builds** de Electron: Servidor (incluye BD) y Cliente (solo UI)

### Archivos clave

| Archivo | Rol |
|---|---|
| `server/src/index.js` | Entry point Express |
| `server/src/config/permissions.js` | Permisos por rol |
| `server/database/knexfile.js` | Config BD (SSL con `DB_SSL=true`) |
| `client/src/store/authStore.js` | Auth state (Zustand) |
| `client/src/lib/api.js` | HTTP client con URL dinámica vía IPC |
| `client/electron/main.js` | Proceso principal Electron |
| `client/electron/dbManager.js` | Gestión embedded-postgres |
| `client/electron/backupManager.js` | pg_dump diario 02:00, 30 días retención |
| `client/electron/preload.js` | IPC bridge |
| `client/electron-builder-server.json` | Config build servidor |
| `client/electron-builder-client.json` | Config build cliente |
| `docs/proyecto.md` | Documentación técnica completa |

### Decisiones técnicas importantes

- `.env` vive en `server/.env` (no en raíz)
- `knexfile.js` en `server/database/knexfile.js`, carga `.env` desde `__dirname/../.env`
- Permisos como JSON en `roles.permisos`, definidos en `server/src/config/permissions.js`
- Administrador tiene `{ all: true }` — bypasea verificación de permisos
- `api.js` en cliente redirige a `/login` automáticamente en 401/403
- Modo servidor/cliente detectado en runtime por presencia de `server-mode.flag` en resources de Electron
- Express corre **in-process** en Electron (no como proceso hijo)
- `getServerUrl()` usa `ipcRenderer.sendSync` (síncrono) para que `api.js` lo llame al inicializar el módulo

---

## Versión actual: v1.1.8

Auto-updater activo — distribuye automáticamente a quienes tengan la app abierta.

### Historial de releases

| Versión | Cambios principales |
|---|---|
| v1.0.0 | Release inicial completo (Fases 1–9) |
| v1.0.1 | Fase 10 (mejoras post-feedback) + bugfixes UI |
| v1.0.2 | Seeds limpios (sin datos de prueba) |
| v1.0.3 | Fix Kardex crash (`e.map is not a function`) |
| v1.0.4 | Fix create en Configuración + decimales + inventario + versión visible |
| v1.0.5 | Fix versión hardcodeada en Splash |
| v1.0.6 | Fix DELETE depósito + decimales cantidad + redondeo POS |
| v1.0.7 | Fix overlap PDF + redondeo como campo en BD (migration 014) |
| v1.0.8 | Fixes y mejoras por feedback de cliente |
| v1.0.9 | Instalador unificado: modo servidor/cliente en runtime |
| v1.1.0 | Backup sin pg_dump + modo oscuro en toda la app |
| v1.1.1 | Fixes varios |
| v1.1.2 | Bump version |
| v1.1.3 | Fixes auth/dark mode/config + rename a Cimiento |
| v1.1.4 | Login: crédito Diganexia |
| v1.1.5 | Dark mode en login + toggle sol/luna en config + título "Cimiento" en barra Windows |
| v1.1.6 | Validación stock en POS + nombres PDF dinámicos + fuentes PDF +3pt + footer PDF fix |
| v1.1.7 | PDFs guardados en Documentos/Cimiento/{tipo}/{fecha}/ + selector período dashboard |
| v1.1.8 | Fix handler PDF IPC + carpeta configurable en Configuración + toast éxito/error |

---

## Fases del proyecto

### Completadas

| Fase | Módulo |
|---|---|
| 1 | Infraestructura base: scaffolding, BD, auth JWT |
| 2 | Stock: ABM productos, stock por depósito, transferencias, ajustes, inventario físico, alertas |
| 3 | Compras: ABM compras (borrador→confirmar), ingreso automático stock, cuenta corriente proveedor |
| 4 | Ventas: POS, ABM ventas/clientes, AFIP (factura A/B con CAE), PDF con pdfkit |
| 5 | Cuentas corrientes: estado de cuenta, cobros/pagos, cuotas, PDF |
| 6 | Tesorería: apertura/cierre caja, arqueos, movimientos manuales, PDF |
| 7 | Usuarios y Configuración: ABM usuarios, roles, rubros, unidades, medios de pago, depósitos, cajas |
| 8 | Reportes y Dashboard: KPIs, bar chart, 7 tabs de reportes (PDF + CSV) |
| 9 | Empaquetado: Electron con embedded-postgres, splash, backup automático, 2 instaladores |
| 10 | Mejoras post-feedback: recibo PDF cobro, cheques, retenciones, notas débito/crédito, vista ventas por cliente, tipo documento |

### Migraciones BD aplicadas

`001` a `014` — todas aplicadas. La `010` agrega `cheques`, `011` retenciones, `012` extiende CHECK ventas para NC/ND, `013` agrega `pasaporte`/`tipo_documento` a clientes, `014` agrega `redondeo_monto` a `ventas`.

---

## Cómo buildear y publicar

### Requisitos previos (workaround winCodeSign)

electron-builder 26.x no puede extraer winCodeSign en Windows sin Developer Mode. El parche ya está aplicado a dos archivos en `node_modules`:
- `node_modules/app-builder-lib/out/binDownload.js` → `doGetBin()` devuelve ruta fija para "winCodeSign"
- `node_modules/app-builder-lib/out/winPackager.js` → rcedit se llama desde caché con `execFileSync`
- Caché en: `C:\Users\lgarello\AppData\Local\electron-builder\Cache\winCodeSign\stable\` (rcedit-x64.exe y rcedit-ia32.exe)

**Si se reinstala node_modules**, replicar el parche y verificar que exista la carpeta `stable\` con los exe.

Node.js requerido: v20+ (v24.15.0 instalado en este equipo). v18.12.1 falla con postcss.config.js ESM.

### Build

```powershell
cd client
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run electron:build:server   # → dist-electron/server/Corralon-Servidor-Setup-X.Y.Z.exe
npm run electron:build:client   # → dist-electron/client/Corralon-Cliente-Setup-X.Y.Z.exe
```

### Publicar release

```powershell
$gh = "C:\Users\Lautaro\AppData\Local\Temp\gh_cli\bin\gh.exe"
# (puede no estar si se reinició la PC — reinstalar gh CLI portable si no existe)
& $gh release create vX.Y.Z `
  "D:\ferreteria-software\client\dist-electron\server\Corralon-Servidor-Setup-X.Y.Z.exe" `
  "D:\ferreteria-software\client\dist-electron\server\Corralon-Servidor-Setup-X.Y.Z.exe.blockmap" `
  "D:\ferreteria-software\client\dist-electron\server\server.yml" `
  "D:\ferreteria-software\client\dist-electron\client\Corralon-Cliente-Setup-X.Y.Z.exe" `
  "D:\ferreteria-software\client\dist-electron\client\Corralon-Cliente-Setup-X.Y.Z.exe.blockmap" `
  "D:\ferreteria-software\client\dist-electron\client\client.yml" `
  --title "vX.Y.Z" --notes "..." --repo Diganexia/ferreteria-software
```

Channels: servidor usa `server.yml`, cliente usa `client.yml`.  
Para nueva versión: bumppear `client/package.json` y `package.json` (raíz).

---

## Auto-updater

- Repo GitHub: `https://github.com/Diganexia/ferreteria-software`
- `autoUpdater.channel` se setea en `main.js` según `isServerMode()` ('server' o 'client')
- Al abrir la app, comprueba el canal correspondiente y descarga/instala automáticamente

---

## Clean install (borrar la BD)

La carpeta userData de Electron es `%APPDATA%\ferreteria-client` (usa el campo `name` del `package.json`, NO el `productName`).

```
1. Cerrar la app
2. Borrar %APPDATA%\ferreteria-client
3. Reinstalar desde GitHub
```

---

## Bugs conocidos / pendientes

### ~~v1.0.5 — DELETE depósito tira 500~~ — RESUELTO en v1.0.6

`configuracionController.js:deleteDeposito` consultaba `db('stock')` pero la tabla real es `stock_por_deposito`. También tenía el texto del error con encoding roto.

### ~~v1.0.5 — Campos de cantidad muestran decimales innecesarios~~ — RESUELTO en v1.0.6

`step="0.001"` en los inputs de "Stock mínimo" (ProductoForm) y "Cantidad nueva" (Ajuste) hacía que el browser mostrara `1000,000` en locale español. Fix: `step="1"` + `parseFloat()` al cargar `stock_minimo` desde la API.

### ~~v1.0.5 — POS rechazaba pagos redondeados~~ — RESUELTO en v1.0.6

Checkbox "Redondear a $X.X00" en la sección de totales del POS. Solo aparece cuando el total tiene centavos. Al tildarlo: muestra línea "Redondeo: -$X", auto-llena el pago (si hay una sola forma de pago), ajusta el `descuento_porcentaje` enviado al backend para que el total guardado en BD también quede redondeado. El checkbox se resetea automáticamente si cambia el carrito.

### ~~v1.0.4 — versión en Login muestra "1.0.0"~~ — RESUELTO en v1.0.5

Era `Splash.jsx` (pantalla negra de carga de Electron) que tenía `v1.0.0` hardcodeado desde la Fase 9. Reemplazado por `import { version } from '../../package.json'` igual que en Login y Dashboard.

### Instalador unificado (implementado en v1.0.9)

Un solo instalador `Cimiento-Setup-X.Y.Z.exe`. Al primer arranque pregunta si es Servidor o Cliente y guarda en `app-config.json`. Config en `electron-builder-unified.json`.

---

## Restricciones del proyecto

- Stack 100% gratuito y open source
- PDF: solo `pdfkit` (MIT)
- AFIP: solo `node-afip` directo contra WSFE/WSAA — prohibido TusFacturas y similares
- PostgreSQL portable via `embedded-postgres` — sin instalación manual
- Sin servicios de pago en ninguna capa

---

## Cambios específicos de v1.0.4 (para referencia)

### Root cause de "(intermediate value) is not iterable"

En PostgreSQL, Knex sin `.returning()` devuelve un objeto pg no iterable (no un array). El insert SÍ funciona pero el servidor crashea con 500. Afectaba a todos los `create` en `configuracionController.js`.

**Fix:** cambiar `const [id] = await db('tabla').insert({...})` + query separado, a:
```js
const [row] = await db('tabla').insert({...}).returning('*');
res.status(201).json(row);
```
Aplicado en: `createRubro`, `createDeposito`, `createUnidad`, `createMedioPago`, `createCaja`, `createPuntoVenta`.

### Pérdida de foco después de error (Configuración)

`alert()` en Electron no devuelve el foco correctamente al campo de texto.  
**Fix:** Reemplazado por estado de error inline en `SimpleListTab` y `TabAFIP` (variable `err` + `setErr('')` al inicio de cada acción).

### Decimales en stock (1000.000 → 1000)

Función: `parseFloat(parseFloat(n).toFixed(3)).toString()`  
Aplicada en: `StockBadge.jsx`, `StockView.jsx` (columna Mínimo), `Ajuste.jsx` (stock actual y delta).

### Unidad de medida en Ajuste

El producto tiene campo `unidad_abreviatura` en la respuesta del endpoint `/productos`.  
Guardado en estado `productoUnidad` al seleccionar producto (`seleccionarProducto`).  
Mostrado en el delta: `+500 m` en vez de `+500 unidades`.

### Inventario "Ya hay uno abierto"

El servidor ya devolvía `{ error: '...', inventario_id: existente.id }` en el 409.  
**Fix frontend:** Si la respuesta tiene `inventario_id`, guardar y mostrar botón "Continuar inventario existente".  
**Fix nuevo:** Botón "Cancelar inventario" en pasos CONTEO y DIFERENCIAS → llama a `DELETE /inventario/:id`.  
**Backend nuevo:** `cancelarInventario` en `inventarioController.js`, ruta en `inventario.js`, export en `stockService.js`.

### Versión visible

`import { version } from '../../package.json'` en `Login.jsx` y `Dashboard.jsx`.  
Login: debajo del subtítulo. Dashboard: badge `vX.Y.Z` en esquina superior derecha del header.
