# Documentación Técnica — Ferretería / Corralón Software

> Documento vivo. Última actualización: 2026-05-22 — v1.2.24.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Desktop client | Electron | 29 |
| Frontend framework | React | 18 |
| Build tool | Vite | 5 |
| CSS | TailwindCSS | 3 |
| Estado global | Zustand | 4 |
| Routing | React Router | 6 |
| HTTP client | Axios | 1.6 |
| Gráficos | Recharts | 2 |
| Backend | Node.js + Express | 4.18 |
| Query builder | Knex.js | 3 |
| Base de datos | PostgreSQL 15+ (64-bit) / SQLite (32-bit) | embedded |
| PostgreSQL embebido | embedded-postgres | — |
| SQLite (32-bit) | better-sqlite3 | 9.6 |
| Autenticación | JWT (jsonwebtoken) | 9 |
| Hash de contraseñas | bcryptjs | 2.4 |
| PDF | pdfkit | 0.15 |
| Facturación electrónica | node-afip | 1.0 |
| Licencias | Cloudflare Workers + KV | — |

---

## Arquitectura

```
Red LAN
┌─────────────────────────────────┐    HTTP/REST    ┌───────────────────────┐
│  Cimiento Servidor (1 PC)       │ ◄────────────► │  Cimiento Cliente     │
│  Electron + React               │    :3001        │  Electron + React     │
│  Express (in-process)           │                 │  (N equipos)          │
│  PostgreSQL embebido (:5433)    │                 └───────────────────────┘
└─────────────────────────────────┘
```

- El servidor corre en **una sola PC** de la red. Incluye PostgreSQL portable sin instalación.
- Los clientes son apps Electron que se conectan por IP de LAN. No requieren internet.
- Un solo instalador unificado: `Cimiento-Setup-X.Y.Z-64bit.exe` o `Cimiento-Setup-X.Y.Z-32bit.exe`. El primer arranque pregunta si es Servidor o Cliente.

### Soporte 32-bit (Windows 7/8/10 32-bit)

Para PCs antiguas con Windows 32-bit se publica un instalador separado que usa **SQLite** en lugar de PostgreSQL.

| | 64-bit | 32-bit |
|--|--------|--------|
| Motor BD | PostgreSQL (embedded-postgres) | SQLite (better-sqlite3) |
| Instalador | `Cimiento-Setup-X.Y.Z-64bit.exe` | `Cimiento-Setup-X.Y.Z-32bit.exe` |
| Canal auto-update | `latest.yml` | `latest-32bit.yml` |
| Datos | `%APPDATA%\ferreteria-client\sqlitedata\pgdata\` | `%APPDATA%\ferreteria-client\sqlitedata\cimiento.db` |

El motor se detecta en runtime con `process.env.CIMIENTO_DB` (`'postgres'` o `'sqlite'`), inyectado desde `package.json.dbEngine` al iniciar Electron. El código del servidor usa `server/src/lib/dbCompat.js` para abstraer diferencias (ILIKE vs LIKE, DATE_TRUNC vs strftime, etc.).

---

## Estructura del proyecto

```
ferreteria-software/          ← monorepo raíz (npm workspaces)
├── docs/
│   ├── proyecto.md
│   └── generate-pdf.js       ← generador del PDF de documentación
├── client/                   ← Electron + React
│   ├── electron/
│   │   ├── main.js           ← proceso principal (detecta modo servidor/cliente)
│   │   ├── preload.js        ← IPC bridge contextIsolation
│   │   ├── dbManager.js      ← gestión embedded-postgres / SQLite
│   │   ├── backupManager.js  ← backup automático diario (pg.Client / better-sqlite3)
│   │   └── ipcHandlers.js
│   ├── electron-builder-unified.json   ← build 64-bit
│   ├── electron-builder-32bit.json     ← build 32-bit
│   └── src/
│       ├── lib/api.js        ← axios con URL dinámica vía IPC
│       ├── store/authStore.js
│       ├── pages/
│       │   ├── Splash.jsx           ← pantalla de arranque (servidor)
│       │   ├── ServerConfig.jsx     ← configuración IP (cliente)
│       │   ├── Activacion.jsx       ← activación de licencia (primera vez)
│       │   ├── Dashboard.jsx        ← KPIs + gráfico 7 días + badge licencia
│       │   ├── Login.jsx
│       │   ├── stock/
│       │   ├── compras/
│       │   ├── ventas/
│       │   ├── clientes/
│       │   ├── proveedores/
│       │   ├── ctacte/
│       │   ├── tesoreria/
│       │   ├── reportes/Reportes.jsx
│       │   └── configuracion/
│       │       ├── Usuarios.jsx
│       │       ├── UsuarioForm.jsx
│       │       ├── Configuracion.jsx  ← tabs: Empresa, AFIP, Catálogo, Depósitos, Cajas, Apariencia
│       │       └── Backup.jsx
│       └── router/index.jsx
└── server/                   ← Node.js + Express
    ├── src/
    │   ├── config/permissions.js
    │   ├── controllers/      ← auth, productos, stock, inventario, compras,
    │   │                        ventas, clientes, proveedores, cajaController,
    │   │                        ctaCte, afip, usuarios, configuracion, reportes
    │   ├── routes/
    │   ├── services/
    │   │   ├── afipService.js
    │   │   └── pdfService.js ← venta, compra, estado de cuenta, arqueo, reporte tabla, recibo
    │   ├── helpers/stockHelper.js
    │   └── index.js
    ├── src/lib/dbCompat.js   ← helpers PG/SQLite (whereIlike, sqlHastaFinDia, rawRows, IS_SQLITE)
    ├── database/
    │   ├── knexfile.js
    │   ├── migrations/            ← 001 a 016 (PostgreSQL)
    │   ├── migrations-sqlite/     ← 001 a 016 (SQLite, adaptadas)
    │   └── seeds/
    └── src/config/empresa.json   ← generado al guardar datos de empresa en UI
```

---

## Base de datos

### Relaciones por módulo

```
[Soporte]     roles → usuarios
[Catálogo]    rubros (árbol) → productos ← proveedores
              productos → unidades_medida
[Stock]       depositos ← stock_por_deposito → productos
              movimientos_stock → productos, depositos, usuarios
[Ventas]      clientes → ventas → ventas_items → productos
[Compras]     proveedores → compras → compras_items → productos
[Tesorería]   cajas → arqueos → movimientos_caja ← medios_pago
[Cta. Cte.]   cuenta_corriente_clientes / proveedores (saldo running)
              cuotas_cliente → ventas
[AFIP]        puntos_venta_afip → comprobantes_afip → ventas
```

### Tablas

| Tabla | Módulo | Descripción |
|-------|--------|-------------|
| `roles` | Auth | Roles con JSON de permisos |
| `usuarios` | Auth | Usuarios del sistema |
| `unidades_medida` | Catálogo | u, kg, m, m², L, bolsa… |
| `rubros` | Catálogo | Categorías en árbol (self-join) |
| `proveedores` | Catálogo | Proveedores con CUIT |
| `productos` | Catálogo | Catálogo con precios, stock mínimo |
| `depositos` | Stock | Almacenes/depósitos |
| `stock_por_deposito` | Stock | Cantidad actual por producto×depósito |
| `movimientos_stock` | Stock | Historial completo con cant. anterior/posterior |
| `clientes` | Ventas | Clientes con tipo IVA y cuenta corriente |
| `ventas` | Ventas | Cabecera (tipo comprobante, estado, pago) |
| `ventas_items` | Ventas | Ítems de cada venta |
| `compras` | Compras | Cabecera de compras |
| `compras_items` | Compras | Ítems de cada compra |
| `medios_pago` | Tesorería | Efectivo, débito, crédito, transferencia |
| `cajas` | Tesorería | Cajas registradoras |
| `arqueos` | Tesorería | Turnos/arqueos con apertura y cierre |
| `movimientos_caja` | Tesorería | Movimientos del arqueo |
| `cuenta_corriente_clientes` | Cta. Cte. | Débitos/créditos con saldo running |
| `cuotas_cliente` | Cta. Cte. | Cuotas de ventas en cuotas |
| `cuenta_corriente_proveedores` | Cta. Cte. | Débitos/créditos proveedores |
| `puntos_venta_afip` | AFIP | Puntos de venta habilitados |
| `comprobantes_afip` | AFIP | Facturas electrónicas con CAE |

---

## Sistema de permisos

Los permisos se almacenan como JSON en `roles.permisos`. El middleware `authorize(modulo, accion)` los verifica.

### Módulos y acciones

| Módulo | Acciones disponibles |
|--------|---------------------|
| `productos` | `ver`, `crear`, `editar`, `eliminar` |
| `stock` | `ver`, `ajustar`, `transferir`, `inventario` |
| `ventas` | `ver`, `crear`, `anular` |
| `compras` | `ver`, `crear`, `confirmar` |
| `clientes` | `ver`, `crear`, `editar` |
| `proveedores` | `ver`, `crear`, `editar` |
| `caja` | `abrir`, `cerrar`, `ver_movimientos` |
| `cta_cte` | `ver`, `cobrar`, `pagar` |
| `usuarios` | `ver`, `crear`, `editar` |
| `reportes` | `ver` |
| `configuracion` | `ver`, `editar` |

> `Administrador` tiene `{ all: true }` — bypasea todas las verificaciones.

---

## API Endpoints

### Auth — `/api/auth`
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/login` | No | `{username, password}` → `{token, usuario, sesiones: {activos, max}}` |
| `POST` | `/logout` | JWT | Invalida sesión + libera slot en Cloudflare KV |
| `GET` | `/me` | JWT | Usuario autenticado |
| `POST` | `/heartbeat` | JWT | Renueva TTL de sesión en KV → `{ok, sesiones: {activos, max}}` |

### Productos — `/api/productos`
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `GET` | `/` | `productos.ver` | Listado con filtros + paginación |
| `GET` | `/:id` | `productos.ver` | Detalle + stock por depósito |
| `POST` | `/` | `productos.crear` | Crear producto |
| `PUT` | `/:id` | `productos.editar` | Editar producto |
| `DELETE` | `/:id` | `productos.eliminar` | Baja lógica |

### Stock — `/api/stock`
| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `GET` | `/` | `stock.ver` | Stock actual por producto×depósito |
| `GET` | `/movimientos` | `stock.ver` | Historial con filtros |
| `POST` | `/transferencia` | `stock.transferir` | Transferencia entre depósitos |
| `POST` | `/ajuste` | `stock.ajustar` | Ajuste manual |

### Inventario — `/api/inventario`
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/` | Abrir sesión |
| `PUT` | `/:id/items` | Cargar conteos |
| `POST` | `/:id/confirmar` | Confirmar (genera ajustes) |

### Compras — `/api/compras`
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Listado con filtros |
| `GET` | `/:id` | Detalle + ítems |
| `GET` | `/:id/pdf` | PDF del comprobante de compra |
| `POST` | `/` | Crear borrador |
| `PUT` | `/:id` | Editar borrador |
| `PUT` | `/:id/confirmar` | Confirmar → ingresa stock + cta cte proveedor |

### Ventas — `/api/ventas`
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Listado con filtros |
| `GET` | `/:id` | Detalle + ítems + AFIP |
| `GET` | `/:id/pdf` | PDF de la venta |
| `POST` | `/` | Crear (acepta `confirmar: true`) |
| `POST` | `/:id/confirmar` | Confirmar → stock + caja + cta cte |
| `POST` | `/:id/anular` | Anular → revierte stock |

### Cuentas Corrientes — `/api/cta-cte`
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/clientes` | Resumen clientes + saldo |
| `GET` | `/clientes/:id` | Movimientos + saldo |
| `GET` | `/clientes/:id/pdf` | PDF estado de cuenta |
| `POST` | `/clientes/cobro` | Registrar cobro |
| `GET` | `/proveedores` | Resumen proveedores |
| `GET` | `/proveedores/:id` | Movimientos + saldo |
| `POST` | `/proveedores/pago` | Registrar pago |
| `GET` | `/cuotas` | Cuotas pendientes/vencidas |
| `PUT` | `/cuotas/:id/pagar` | Marcar cuota pagada |

### Tesorería — `/api/cajas`
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/abrir` | Abrir arqueo |
| `POST` | `/cerrar` | Cerrar con saldo declarado |
| `GET` | `/arqueo-actual` | Arqueo abierto + resumen |
| `GET` | `/arqueos` | Historial de arqueos |
| `GET` | `/arqueos/:id` | Detalle + movimientos |
| `GET` | `/arqueos/:id/pdf` | PDF del arqueo |
| `POST` | `/movimiento-manual` | Ingreso/egreso manual |

### Reportes — `/api/reportes`
Todos aceptan `?format=pdf` y `?format=csv` para exportación.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/kpis` | Ventas hoy, saldo caja, deudores, stock bajo mínimo |
| `GET` | `/ventas-periodo` | Ventas agrupadas por día/semana/mes |
| `GET` | `/ranking-productos` | Top N productos más vendidos |
| `GET` | `/stock-valorizado` | Stock × precio costo/venta |
| `GET` | `/rotacion-stock` | Productos sin movimiento en N días |
| `GET` | `/kardex/:productoId` | Historial de movimientos de un producto |
| `GET` | `/deudores-clientes` | Clientes con saldo deudor |
| `GET` | `/comprobantes-afip` | Comprobantes electrónicos emitidos |

### Usuarios — `/api/usuarios`
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Listado de usuarios |
| `GET` | `/roles` | Roles disponibles |
| `GET` | `/:id` | Detalle de usuario |
| `POST` | `/` | Crear usuario (bcrypt hash) |
| `PUT` | `/:id` | Editar (nombre, email, rol, activo) |
| `PUT` | `/:id/password` | Cambiar contraseña |

### Configuración — `/api/configuracion`
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/PUT` | `/empresa` | Datos del negocio (persiste en empresa.json) |
| `GET/POST/PUT/DELETE` | `/puntos-venta` | CRUD puntos de venta AFIP |
| `GET/POST/PUT/DELETE` | `/rubros` | CRUD rubros |
| `GET/POST/PUT/DELETE` | `/unidades` | CRUD unidades de medida |
| `GET/POST/PUT/DELETE` | `/medios-pago` | CRUD medios de pago |
| `GET/POST/PUT/DELETE` | `/depositos` | CRUD depósitos |
| `GET/POST/PUT` | `/cajas` | Gestión de cajas |

---

## Variables de entorno

En desarrollo: `server/.env`. En producción (app servidor): `userData/app-config.json` + process.env seteado por `main.js`.

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DB_HOST` | Host PostgreSQL | `127.0.0.1` |
| `DB_PORT` | Puerto PostgreSQL | `5433` (embedded) |
| `DB_NAME` | Base de datos | `corralon` |
| `DB_USER` | Usuario PostgreSQL | `corralon` |
| `DB_PASS` | Contraseña (auto-generada) | — |
| `DB_SSL` | Habilitar SSL | `false` |
| `JWT_SECRET` | Secreto JWT (auto-generado) | — |
| `PORT` | Puerto Express | `3001` |
| `ALLOWED_ORIGINS` | Orígenes CORS | `*` (LAN) |
| `AFIP_CUIT` | CUIT para AFIP | — |
| `AFIP_CERT_PATH` | Ruta certificado X.509 | — |
| `AFIP_KEY_PATH` | Ruta clave privada | — |

---

## Scripts

```bash
# client/
npm run electron:dev              # Electron + Vite en desarrollo
npm run electron:dev:server       # idem con SERVER_MODE=true
npm run electron:build:64         # genera Cimiento-Setup-X.Y.Z-64bit.exe (PostgreSQL)
npm run electron:build:32         # genera Cimiento-Setup-X.Y.Z-32bit.exe (SQLite, ia32)

# server/
npm run dev                       # nodemon src/index.js
npm run migrate                   # knex migrate:latest
npm run seed                      # knex seed:run

# docs/
node generate-pdf.js              # genera documentacion-tecnica.pdf
```

---

## Distribución e instalación

### Instaladores

| Archivo | Para quién |
|---------|-----------|
| `Cimiento-Setup-X.Y.Z-64bit.exe` | PCs con Windows 64-bit. Motor PostgreSQL embebido. |
| `Cimiento-Setup-X.Y.Z-32bit.exe` | PCs con Windows 32-bit. Motor SQLite. |

El primer arranque pregunta si la PC es **Servidor** o **Cliente** y guarda la elección en `app-config.json`. No hay instaladores separados para cada rol.

Los instaladores se publican en **GitHub Releases**: `https://github.com/Diganexia/cimiento-software/releases`

### Requisitos de red

- El servidor debe tener el **puerto 3001** abierto en el firewall de Windows.
- Los clientes se conectan por IP local (ej. `http://192.168.1.x:3001`).
- No requiere internet (salvo para actualizaciones automáticas).

### Auto-actualizaciones

Las apps se actualizan solas al publicar una nueva release en GitHub.

- 64-bit → lee `latest.yml`
- 32-bit → lee `latest-32bit.yml`
- El canal se fuerza por código en `main.js` según `package.json.dbEngine` (evita que 32-bit descargue el instalador 64-bit).
- Antes de instalar una actualización se genera un backup automático.
- El usuario ve un diálogo "¿Instalar ahora?" cuando hay una actualización lista.

### Publicar una nueva versión

1. Incrementar `version` en `client/package.json`
2. Construir ambos instaladores:
   ```powershell
   npm run electron:build:64   # desde client/
   npm run electron:build:32   # desde client/
   ```
3. Crear release en GitHub con tag `vX.Y.Z` y subir **6 archivos**:
   - `dist-electron/unified/Cimiento-Setup-X.Y.Z-64bit.exe` + `.blockmap` + `latest.yml`
   - `dist-electron/32bit/Cimiento-Setup-X.Y.Z-32bit.exe` + `.blockmap` + `latest-32bit.yml`

> Sin `latest.yml` o `latest-32bit.yml` el auto-updater no detecta nuevas versiones.

### Clean install — borrar la base de datos

Para reinstalar el software desde cero (sin datos previos), hay que eliminar la carpeta de datos de usuario que Electron genera en el primer arranque. **Esta carpeta contiene la base de datos PostgreSQL**, la configuración y los logs.

> **Importante:** Electron nombra la carpeta con el campo `name` del `package.json` interno (`ferreteria-client`), no con el nombre visible del instalador ("Corralon Servidor").

**Pasos (en la PC servidora):**

1. Cerrar la aplicación completamente (verificar que no quede en la bandeja del sistema).
2. Abrir el Explorador de Windows y pegar en la barra de direcciones:
   ```
   %APPDATA%\ferreteria-client
   ```
3. Borrar toda la carpeta `ferreteria-client`.
4. (Opcional) Desinstalar y reinstalar la app desde GitHub Releases.
5. Al volver a abrir, la app crea la BD desde cero y corre las seeds automáticamente.

**Contenido de la carpeta (referencia):**

```
C:\Users\<usuario>\AppData\Roaming\ferreteria-client\
├── sqlitedata\
│   ├── pgdata\      ← base de datos PostgreSQL (64-bit)
│   └── cimiento.db  ← base de datos SQLite (32-bit)
├── backups\         ← backups automáticos diarios (formato .json)
├── logs\
├── Cache\
└── app-config.json  ← modo (server/client), contraseña BD, licenseKey, etc.
```

> Para los clientes (no el servidor), la carpeta equivalente es `%APPDATA%\ferreteria-client` en cada PC cliente (no contiene BD, solo configuración de conexión).

---

## Capacidad y volumen de datos

El motor de base de datos es PostgreSQL completo (no SQLite ni similar). El límite real lo impone el hardware de la PC servidora, no el software.

### Volúmenes cómodos para un corralón típico

| Entidad | Volumen cómodo | Observaciones |
|---------|---------------|---------------|
| Productos | hasta ~50.000 SKUs | sin límite práctico real |
| Ventas/año | hasta ~100.000 | sin límite práctico real |
| Ítems de venta | millones | sin límite práctico real |
| Movimientos de stock | millones | sin límite práctico real |
| Años de datos | 10–20 años | depende del disco disponible |

Para un corralón mediano (50–200 ventas/día, 2.000–10.000 productos), la base de datos en 10 años ocupa aproximadamente **2–5 GB** incluyendo índices.

### Cuellos de botella conocidos

1. **Reportes sin paginación** — algunos endpoints devuelven todos los registros en una sola respuesta. Con cientos de miles de filas pueden ser lentos o consumir mucha memoria.
2. **PDFs de reportes grandes** — pdfKit construye el PDF en memoria; un reporte de 50.000+ filas puede tardar 30–60 segundos o agotar RAM.
3. **Usuarios concurrentes** — el servidor embebido comparte CPU/RAM con la UI de la PC servidora; con 5–8 clientes haciendo consultas pesadas en simultáneo puede haber latencia.
4. **Backups** — `pg_dump` de una BD de 5 GB tarda varios minutos (no bloquea la operación).

> **Plan de mitigación:** si los reportes se vuelven lentos con el tiempo, el fix es agregar paginación y límites a esas queries en el servidor. No requiere cambios en la BD ni en el esquema.

---

## Credenciales iniciales

| Campo | Valor |
|-------|-------|
| Usuario | `admin` |
| Contraseña | `admin1234` |
| Rol | Administrador |

> **Cambiar la contraseña inmediatamente** en la primera sesión.

---

## Progreso del desarrollo

- [x] **Fase 1** — Infraestructura base (scaffolding, BD, auth JWT)
- [x] **Fase 2** — Stock (ABM productos, stock, transferencias, ajustes, inventario, alertas)
- [x] **Fase 3** — Compras (ABM con borrador/confirmar, ingreso de stock, cta cte proveedores)
- [x] **Fase 4** — Ventas + AFIP (POS, factura A/B, CAE, PDF)
- [x] **Fase 5** — Cuentas corrientes (clientes, proveedores, cuotas)
- [x] **Fase 6** — Tesorería (caja, arqueos, movimientos manuales, PDF arqueo)
- [x] **Fase 7** — Usuarios, roles y configuración general
- [x] **Fase 8** — Reportes y dashboard con KPIs
- [x] **Fase 9** — Deploy: dos instaladores, embedded-postgres, splash, backup automático
- [x] **Distribución** — GitHub Releases + auto-updater configurado (v1.0.0 publicada)
- [x] **Fase 10** — Mejoras post-feedback cliente (en curso)
  - [x] 10.1 Recibo PDF de cobro (`GET /api/cta-cte/clientes/cobro/:id/pdf`, botón en UI)
  - [x] 10.2 Cheque como medio de pago (tabla `cheques`, migración 010, seed actualizado, campos en modal cobro, datos en recibo PDF)
  - [x] 10.3 Retenciones (tabla `retenciones`, migración 011, integrada en cobro y PDF recibo, UI en modal cobro)
  - [x] 10.4 Nota de débito/crédito A/B con ARCA (migración 012, TIPO_CBTE extendido en afipService, labels en pdfService, selector en PuntoVenta, validación REQUIERE_AFIP)
  - [x] 10.5 Vista de ventas por cliente (`/clientes/:clienteId/ventas`, filtros fecha/estado, totales, PDF/Ver por fila, link desde tabla Clientes)
  - [x] 10.6 Reporte ventas por cliente (`GET /api/reportes/ventas-por-cliente`, tab en Reportes, filtros fecha/estado, PDF+CSV, totales)
  - [x] 10.7 Tipo de documento selector (migración 013 agrega `pasaporte`+`tipo_documento`, selector dinámico en ClienteForm, display en lista)
- [x] **Bugs UI corregidos (2026-05-15)**
  - Bug 1 (focus loss): `Field`/`Label` definidos dentro de componentes padre → React los destruía/remontaba en cada render. Movidos a nivel de módulo en `ProductoForm.jsx`, `ClienteForm.jsx`, `CompraForm.jsx`, `ProveedorForm.jsx`, `Transferencia.jsx`.
  - Bug 2 (sidebar múltiple highlight): NavLink sin `end` hacía que rutas como `/ventas` activen también al navegar a `/ventas/nueva`. Se añadió `end: true` a los ítems: Productos, Ventas, Clientes, Compras, Proveedores, Configuración.

---

## Historial de versiones post v1.0.3

### v1.0.4 (2026-05-16)
- Fix `configuracionController.js`: INSERT sin `.returning()` en PostgreSQL devuelve objeto no iterable → 500. Corregido con `.returning('*')` en `createRubro`, `createDeposito`, `createUnidad`, `createMedioPago`, `createCaja`, `createPuntoVenta`.
- Fix `Configuracion.jsx`: `alert()` reemplazado por error inline (pérdida de foco en Electron).
- Fix decimales innecesarios en stock (1000.000 → 1000).
- Feat: unidad de medida real del producto en delta de Ajuste.
- Feat: Inventario maneja sesión ya abierta (409 con botón "Continuar" o "Cancelar").
- Feat: versión visible en Login y Dashboard.

### v1.0.5 (2026-05-16)
- Fix: `Splash.jsx` tenía `v1.0.0` hardcodeado. Reemplazado por `import { version } from '../../package.json'`.

### v1.0.6 (2026-05-16)
- Fix DELETE depósito: consultaba tabla `stock` (no existe), corregido a `stock_por_deposito`.
- Fix decimales en inputs de cantidad (`step="1"` + `parseFloat` al cargar stock_minimo).
- Feat: checkbox "Redondear" en POS — ajusta descuento para que el total guardado en BD quede redondeado.

### v1.0.7 (2026-05-17)
- Fix: PDF segunda página innecesaria — footers anclados con `doc.page.height - margins.bottom - 14`.
- Feat: `redondeo_monto` como campo en BD (migración 014).

### v1.0.8 (2026-05-17)
- Fixes y mejoras por feedback del cliente (varios bugs menores de UI).

### v1.0.9 (2026-05-17)
- Instalador unificado: un solo `Cimiento-Setup-X.Y.Z.exe`. Primer arranque pregunta si es Servidor o Cliente, guarda en `app-config.json` en userData.
- Modo servidor/cliente detectado en runtime leyendo `app-config.json` en vez de `server-mode.flag`.
- Discovery de servidor vía UDP broadcast puerto 45678.

### v1.1.0 (2026-05-17)
- Backup sin `pg_dump`: `embedded-postgres` v18 no incluye `pg_dump`. `backupManager.js` reescrito con `pg.Client` directo. Formato `.json`.
- Dark mode completo en toda la app: `darkMode: 'class'` en Tailwind. Toggle como pill con iconos sol/luna en Configuración. Login también aplica dark mode.

### v1.1.1 – v1.1.2 (2026-05-17)
- Fixes varios de dark mode, autenticación y configuración.

### v1.1.3 (2026-05-17)
- Fixes auth/dark mode/configuración + rename a **Cimiento** (productName, título barra Windows).
- `appId` y `name` de package.json sin cambiar (compatibilidad con installs existentes).

### v1.1.4 (2026-05-17)
- Login: crédito Diganexia.

### v1.1.5 (2026-05-17)
- Dark mode en Login + toggle sol/luna en Configuración + título "Cimiento" en barra Windows.

### v1.1.6 (2026-05-18)
- Validación de stock en POS antes de confirmar.
- Nombres de PDF dinámicos (incluyen nombre de cliente y fecha).
- Fuentes PDF +3pt respecto al baseline original.
- Footer PDF anclado correctamente.

### v1.1.7 (2026-05-18)
- PDFs guardados en `Documentos/Cimiento/{tipo}/{fecha}/` via IPC.
- `pdfUtils.js` con helper `savePdf(blob, tipo, filename)` — IPC en Electron, download en browser.
- Selector de período en dashboard (hoy / esta semana / este mes).

### v1.1.8 (2026-05-18)
- Fix handler `save-pdf` IPC: estaba dentro de `bootSetup()` (solo primer arranque). Movido a `registerUniversalAsyncIPC()`.
- Carpeta de PDFs configurable desde Configuración (picker nativo + persistencia en `app-config.json`).
- Toast de éxito/error al guardar PDF (inyección DOM en `pdfUtils.js`, sin estado React).

### v1.1.9 (2026-05-18)
- POS: stock mostrado y validado por depósito seleccionado (no total). Backend acepta `deposito_id` en `/api/productos`.
- Caja — movimientos: fuente reducida a `text-xs`, padding compacto para que entren en un renglón.

### v1.2.0 (2026-05-18)
- Configuración: botón "Buscar actualizaciones" con estado en tiempo real (checking / available / downloading / downloaded / not-available / error).
- IPC handlers: `check-for-updates`, `install-update`, `onUpdateStatus`.

### v1.2.1 (2026-05-18)
- Sidebar: "Stock por depósito" → "Stock General".
- StockView: título "Stock General" + filtro por distribuidor.
- Ventana mínima: 1366×768.
- Fix empresa.json: ahora se guarda en `app.getPath('userData')` en vez de `resources/` (sin permisos de escritura en producción, se borraba en updates).

### v1.2.2 (2026-05-18)
- Fix PDF estado de cuenta: columnas Debe/Haber/Saldo redimensionadas (55→88px) con `lineBreak: false` para evitar wrap de montos grandes.
- Transferencias: un solo movimiento tipo `TRANSFERENCIA` (antes TRANSFERENCIA_ENTRADA + TRANSFERENCIA_SALIDA con depósitos incompletos).
- Cantidades en transferencias: enteras (`Math.floor`, `step="1"`).

### v1.2.3 (2026-05-19)
- Fix crítico transferencias: `TRANSFERENCIA` no era un valor válido del ENUM `movimientos_stock_tipo` en PostgreSQL. Migración 016 agrega el valor (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`, fuera de transacción).
- Movimientos: registros viejos `TRANSFERENCIA_ENTRADA`/`TRANSFERENCIA_SALIDA` muestran label "Transferencia".
- Movimientos: tabla compacta (`text-xs`, `px-3 py-2`, `whitespace-nowrap`) para que cada fila entre en un renglón.
- Transferencia: muestra stock disponible del depósito de origen al seleccionarlo.

### v1.2.4 (2026-05-19)
- Fix migración 016: Knex no soporta `ALTER TYPE ... ADD VALUE` nativo. Reescrita usando `DO $$ BEGIN ... EXCEPTION ... END $$` con `config = { transaction: false }`.

### v1.2.5 – v1.2.10 (2026-05-19)
- Mejoras de ícono de aplicación iterativas (logo Cimiento con fondo transparente, variantes de padding y forma circular).

### v1.2.11 (2026-05-20)
- Compras: cantidad entera (`step=1`), filtro "solo productos del proveedor" + dropdown con flecha en buscador de productos.
- Productos: campo Estado (Activo/Inactivo) en formulario de edición/creación.

### v1.2.12 (2026-05-20)
- **Sistema de licencias**: Cloudflare Workers + KV. Pantalla de activación en primer arranque. Badge en Dashboard. Gracia offline 7 días. Anti-manipulación de reloj.
- **Bloqueo de acceso**: overlay pantalla completa cuando licencia `vencida`/`suspendida`/`offline_expirado`/`invalida`. Botón "Reintentar" para reverificar.
- **PDF de compras**: botón en `CompraDetalle` que genera y descarga `Compra_{Proveedor}_{fecha}.pdf` vía `generarCompraPDF()` en `pdfService.js`. Guarda en `Documents/Cimiento/Compras/`.
- **Fix cursor en edición de productos**: `ProductoForm` ahora espera a que los datos del producto carguen antes de renderizar los inputs (estado `ready`), evitando re-render que causaba pérdida de foco.

### v1.2.13 (2026-05-20)
- **Límite de usuarios simultáneos**: campo `max_usuarios` en KV. Al loguear en modo servidor, se registra sesión en Worker (TTL 15 min, heartbeat cada 9 min). Si ya hay `max_usuarios` sesiones activas, el login falla con mensaje claro. Al cerrar sesión se libera el slot. Editar `max_usuarios` en KV para cambiar el límite sin tocar código.

### v1.2.14 (2026-05-20)
- **Fix modo cliente**: las máquinas en modo cliente ya no pasan por activación de licencia ni verifican con Cloudflare. Solo el servidor lo hace. Los clientes confían en que el servidor está licenciado.

### v1.2.15 (2026-05-20)
- **ABM Roles**: nueva pantalla en Configuración para crear/editar/eliminar roles y sus permisos JSON.
- **Fix usuarios iterable**: controlador usuarios: INSERT y UPDATE ahora usan `.returning('*')` para devolver array iterable.
- **Sesiones via server**: `login` y `logout` llaman al Worker de Cloudflare para registrar/liberar sesión; `heartbeat` renueva TTL y devuelve `sesiones: {activos, max}`.

### v1.2.16 (2026-05-20)
- **Worker Cloudflare — validación mejorada**: verifica `estado === 'activa'` Y `vence >= hoy` (comparación de strings ISO YYYY-MM-DD). Antes solo validaba `estado`.
- **Fix Activacion.jsx**: usa `resultado.valida` como única fuente de verdad para bloquear acceso (incluye estados `vencida`, `suspendida`, `invalida`).
- **Badge usuarios en Dashboard**: visible solo en modo servidor; muestra `X/Y usuarios activos` leyendo `sesiones` de `licenciaStore`. Se actualiza en login y cada 9 min por heartbeat.
- **Sidebar — filtrado por permisos**: cada ítem de navegación tiene un campo `perm: 'modulo.accion'`. Si el usuario no tiene el permiso, el ítem no se renderiza. Las secciones sin ítems visibles tampoco se muestran. Administrador (`{ all: true }`) ve todo.
- **Fix 403 no cierra sesión**: `api.js` interceptor redirige a `/login` solo en 401 (token inválido). 403 (sin permiso) rechaza el error sin desloguear.
- **Ventas — columna Tipo de pago**: nueva columna "Pago" en la tabla de ventas con labels `Contado` / `Cta. Cte.`.
- **Configuración — tab Apariencia**: nueva pestaña con toggle dark/light mode y selector de modo ventana (Ventana / Maximizada / Pantalla completa). IPC handlers `get-window-mode` / `set-window-mode` en `main.js`. El modo se persiste en `app-config.json` y se aplica al iniciar.

### v1.2.19 (2026-05-21)
- **Clientes — Dar de alta**: nueva acción para reactivar clientes dados de baja. Endpoint `PATCH /clientes/:id/activar` (pone `activo = true`). En la lista, el botón cambia según estado: "Dar de baja" (rojo) si activo, "Dar de alta" (verde) si inactivo. Visible tanto en la vista "Dados de baja" como en "Todos".
- **Soporte Windows 32-bit (SQLite)**: build dual PG/SQLite en el mismo repo. Motor detectado por `process.env.CIMIENTO_DB`. Migraciones SQLite en `migrations-sqlite/`. `dbCompat.js` abstrae diferencias de sintaxis. Fix race condition splash en 32-bit.

### v1.2.20 (2026-05-22)
- **Importar backup desde archivo externo**: botón en Configuración > Backup para restaurar un `.json` desde cualquier ubicación del disco (migración 32↔64 bit).
- **Fix restore PG→SQLite**: `toSQLiteValue()` convierte booleans (`true/false` → `1/0`) y objetos/JSON antes de insertar en SQLite.
- **Fix `require` package.json**: ruta corregida a absoluta en `main.js` (evitaba error al resolver `pkg.dbEngine`).

### v1.2.21 (2026-05-22)
- **Fix auto-updater canal**: canal forzado por código en `main.js` (`pkg.dbEngine === 'sqlite' ? 'latest-32bit' : 'latest'`). Evita que la versión 32-bit descargue el instalador 64-bit. No depender solo de `app-update.yml`.

### v1.2.22 (2026-05-22)
- **Indicador 32-bit/64-bit**: se muestra junto a la versión en todas las pantallas (Dashboard, Login, Splash, Setup, Activación). Expuesto via `window.electronAPI.dbEngine` en `preload.js`.

### v1.2.23 (2026-05-22)
- **Fix caja obligatoria en cobros**: `ctaCteController.cobrar()` ahora bloquea el registro si no hay arqueo abierto cuando se selecciona medio de pago (igual que ventas).
- **Fix KPIs Dashboard en SQLite**: `reportesController.kpis()` usaba `DISTINCT ON` (PG-only) y `.rows[0]` (PG-only). Reescrito con subquery compatible + `rawRows()`. Esto causaba que deudores y stock bajo mostraran 0 en la versión 32-bit.
- **Fix Rotación de stock en SQLite**: query reescrita con `julianday()` y sin `NULLS FIRST` (ambos PG-only).
- **Backup automático pre-actualización**: se genera un backup antes de instalar cualquier actualización, tanto desde el diálogo automático como desde el botón de Configuración.

### v1.2.24 (2026-05-22)
- **Fix crítico auto-updater**: un segundo bloque `if (!isDev)` en `main.js` pisaba el canal `latest-32bit` con `'latest'` (ambos bloques actúan sobre la misma instancia cacheada de `autoUpdater`). Eliminada la línea redundante `autoUpdater.channel = 'latest'` del segundo bloque.

### v1.2.18 (2026-05-20)
- **Logout — spinner de carga**: botón "Cerrar sesión" en Sidebar muestra spinner + texto "Cerrando sesión..." mientras se procesa la llamada a Cloudflare. Evita doble click y da feedback visual.
- **Login — estado de carga**: inputs deshabilitados y botón con spinner mientras se autentica.

### v1.2.17 (2026-05-20)
- **Clientes — soft delete visible**: "Dar de baja" hace baja lógica (`activo = false`). La lista ahora incluye filtro Activos / Dados de baja / Todos. Clientes dados de baja muestran badge en su fila y ocultan el botón de baja.
- **Compras — cantidad entera al cargar borrador**: al editar un borrador, las cantidades se parsean con `Math.round()` para mostrar enteros (la BD almacena decimal).
- **Productos — botón "Eliminar"**: renombrado de "Baja" a "Eliminar" para mayor claridad.

### v1.2.6 (2026-05-19)
- Nuevo ícono de aplicación: logo Cimiento (casa + ladrillos + perfiles) con fondo transparente, formato ICO con 6 tamaños embebidos (16, 32, 48, 64, 128, 256px). Se aplica en barra de tareas, instalador NSIS y accesos directos.

### v1.2.5 (2026-05-19)
- Fix Productos: baja con `window.confirm()` (diálogo nativo OS) causaba pérdida de foco en Electron — inputs del formulario de edición siguiente no mostraban cursor. Reemplazado por confirmación inline (Sí/No en la fila).
- Fix POS cantidad: input con `min="0.001" step="any"` hacía que la flecha del spinner nativo fuera de 0 a 0,001. Corregido a `min="1" step="1"` + parseo `Math.round()` en `updateItem`.
- POS cliente: renombrado "Consumidor final" → "Ocasional" en el selector. El concepto "Consumidor Final" es fiscal (ARCA) y ya queda representado en el tipo de comprobante (Factura B).
- POS tipo de pago: "Cuenta corriente" solo disponible cuando hay cliente registrado seleccionado. Si se selecciona "Ocasional" estando en cuenta corriente, se resetea automáticamente a "Contado". Validación también en `handleSubmit`.
- "Ocasional" propagado a: PDF de comprobante, lista de ventas, detalle de venta, reporte de arqueos, nombre de archivo PDF generado.

---

### Licencias — Cloudflare Workers KV (externo)

El sistema de licencias corre fuera del servidor Express, en un **Cloudflare Worker**.

| Método | URL / Acción | Descripción |
|--------|-------------|-------------|
| `GET` | `?key=KEY` | Valida la licencia. Verifica `estado === 'activa'` Y `vence >= hoy` (ISO YYYY-MM-DD). Retorna `{valida, estado, vence, razon_social, max_usuarios, mensaje, serverTime}` |
| `POST` | `?key=KEY&action=register` body `{session_id}` | Registra sesión activa (TTL 15 min). Rechaza con `limite_usuarios` si se superó `max_usuarios`. |
| `POST` | `?key=KEY&action=unregister` body `{session_id}` | Libera la sesión al cerrar sesión. |

**Worker URL:** `https://cimiento-licencias.cliford00001.workers.dev/`

**Estados posibles:** `activa`, `vencida`, `suspendida`, `invalida`

**Formato de entrada KV:**
```json
{
  "estado": "activa",
  "vence": "YYYY-MM-DD",
  "razon_social": "Nombre del cliente",
  "mensaje": "",
  "max_usuarios": 3
}
```
`max_usuarios` es opcional; si no está presente, no hay límite. Para cambiarlo: editar la entrada en el dashboard Cloudflare → KV → `cimiento-licencias`.

**Gestión de sesiones:** cada instalación servidor tiene un `session_id` único persistido en `localStorage` (`cimiento_session_id`). Al loguear se registra con TTL 15 min; el heartbeat lo renueva cada 9 min. Al cerrar sesión se desregistra. En KV las sesiones activas se almacenan como `sess:{KEY}:{session_id}`.

**Flujo en modo servidor:**
1. Primera vez → pantalla `/activacion` (requiere internet)
2. Clave válida → se guarda en `app-config.json` (`licenseKey`)
3. Al loguear → `POST action=register`; si supera `max_usuarios` → error en login. Respuesta incluye `sesiones: {activos, max}` → se guarda en `licenciaStore` y muestra badge en Dashboard
4. Heartbeat cada 9 min → renueva TTL de la sesión; respuesta también actualiza `sesiones`
5. Al cerrar sesión → `POST action=unregister`
6. `ProtectedRoute` verifica licencia en background; `Layout` muestra overlay bloqueante si `vencida`/`suspendida`/`offline_expirado`/`invalida`
7. Gracia offline: 7 días desde el último check exitoso (caché en `localStorage`)
8. Badge en Dashboard si la licencia está por vencer (<30d), vencida, suspendida u offline

**Modo cliente:** las máquinas cliente (modo `client`) **no verifican la licencia ni registran sesión**. Solo el servidor lo hace. Los clientes confían en que el servidor está licenciado.

---

## Migraciones BD

| Migración | Descripción |
|-----------|-------------|
| 001 | Tablas de soporte: roles, usuarios |
| 002 | Catálogo: rubros, unidades_medida, proveedores, productos |
| 003 | Stock: depositos, stock_por_deposito, movimientos_stock |
| 004 | Ventas: clientes, ventas, ventas_items, medios_pago |
| 005 | Compras: compras, compras_items |
| 006 | Tesorería: cajas, arqueos, movimientos_caja |
| 007 | Cuentas corrientes: cuenta_corriente_clientes/proveedores, cuotas_cliente |
| 008 | AFIP: puntos_venta_afip, comprobantes_afip |
| 009 | Inventario: inventarios, inventario_items |
| 010 | Cheques: tabla cheques, cheque_id en movimientos_caja |
| 011 | Retenciones: tabla retenciones |
| 012 | Notas débito/crédito: extiende CHECK constraint en ventas.tipo |
| 013 | Clientes: agrega pasaporte y tipo_documento |
| 014 | Ventas: agrega redondeo_monto |
| 015 | Ventas: UNIQUE constraint en ventas.numero |
| 016 | movimientos_stock: agrega valor TRANSFERENCIA al enum tipo |

---

## Cómo ver la base de datos (herramientas GUI)

### Versión 64-bit — PostgreSQL embebido

PostgreSQL corre en el puerto **5433** (no el 5432 estándar) con usuario `corralon`, base `corralon`. La contraseña está en `%APPDATA%\ferreteria-client\app-config.json` → campo `dbPassword`.

**Herramientas recomendadas:**

| Herramienta | Gratuita | Descarga |
|---|---|---|
| **pgAdmin 4** | ✓ | https://www.pgadmin.org |
| **DBeaver Community** | ✓ | https://dbeaver.io |
| **TablePlus** | Parcial (plan free limitado) | https://tableplus.com |

**Conexión en pgAdmin / DBeaver:**
```
Host:     127.0.0.1
Port:     5433
Database: corralon
Username: corralon
Password: (ver app-config.json → dbPassword)
```

> La contraseña cambia por instalación (se genera aleatoriamente en el primer inicio). Siempre leerla desde `app-config.json`.

---

### Versión 32-bit — SQLite

La base de datos es un archivo único en `%APPDATA%\ferreteria-client\sqlitedata\cimiento.db`.

**Herramientas recomendadas:**

| Herramienta | Gratuita | Descarga |
|---|---|---|
| **DB Browser for SQLite** | ✓ | https://sqlitebrowser.org |
| **DBeaver Community** | ✓ | https://dbeaver.io |
| **SQLiteStudio** | ✓ | https://sqlitestudio.pl |

**Pasos en DB Browser for SQLite:**
1. Abrir DB Browser for SQLite
2. Archivo → Abrir base de datos
3. Navegar a `%APPDATA%\ferreteria-client\sqlitedata\cimiento.db`
4. Ir a pestaña "Explorar datos" para ver las tablas

> SQLite no requiere usuario ni contraseña. El archivo se puede abrir directamente, pero conviene cerrar Cimiento primero para evitar conflictos de escritura.
