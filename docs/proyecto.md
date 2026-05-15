# Documentación Técnica — Ferretería / Corralón Software

> Documento vivo. Última actualización: 2026-05-15 — Todas las fases completadas (1–9).

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
| Base de datos | PostgreSQL | 15+ (embedded) |
| PostgreSQL embebido | embedded-postgres | — |
| Autenticación | JWT (jsonwebtoken) | 9 |
| Hash de contraseñas | bcryptjs | 2.4 |
| PDF | pdfkit | 0.15 |
| Facturación electrónica | node-afip | 1.0 |

---

## Arquitectura

```
Red LAN
┌─────────────────────────────────┐    HTTP/REST    ┌───────────────────────┐
│  Corralon Servidor (1 PC)       │ ◄────────────► │  Corralon Cliente     │
│  Electron + React               │    :3001        │  Electron + React     │
│  Express (in-process)           │                 │  (N equipos)          │
│  PostgreSQL embebido (:5433)    │                 └───────────────────────┘
└─────────────────────────────────┘
```

- El servidor corre en **una sola PC** de la red. Incluye PostgreSQL portable sin instalación.
- Los clientes son apps Electron que se conectan por IP de LAN. No requieren internet.
- Dos instaladores: `Corralon Servidor Setup.exe` y `Corralon Cliente Setup.exe`.

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
│   │   ├── dbManager.js      ← gestión embedded-postgres
│   │   ├── backupManager.js  ← pg_dump, backup automático diario
│   │   └── server-mode.flag  ← presente solo en build servidor
│   ├── electron-builder-server.json
│   ├── electron-builder-client.json
│   └── src/
│       ├── lib/api.js        ← axios con URL dinámica vía IPC
│       ├── store/authStore.js
│       ├── pages/
│       │   ├── Splash.jsx           ← pantalla de arranque (servidor)
│       │   ├── ServerConfig.jsx     ← configuración IP (cliente)
│       │   ├── Dashboard.jsx        ← KPIs + gráfico 7 días
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
│       │       ├── Configuracion.jsx  ← tabs: Empresa, AFIP, Catálogo, Depósitos, Cajas
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
    │   │   └── pdfService.js ← venta, estado de cuenta, arqueo, reporte tabla
    │   ├── helpers/stockHelper.js
    │   └── index.js
    ├── database/
    │   ├── knexfile.js
    │   ├── migrations/       ← 001 a 009
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
| `POST` | `/login` | No | `{username, password}` → `{token, usuario}` |
| `POST` | `/logout` | JWT | Invalida sesión cliente |
| `GET` | `/me` | JWT | Usuario autenticado |

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
| `POST` | `/` | Crear borrador |
| `PUT` | `/:id` | Editar borrador |
| `POST` | `/:id/confirmar` | Confirmar → ingresa stock + cta cte proveedor |

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
# Raíz del monorepo
npm run dev                       # server + client en paralelo (desarrollo)

# client/
npm run electron:build:server     # genera Corralon Servidor Setup.exe
npm run electron:build:client     # genera Corralon Cliente Setup.exe
npm run electron:dev              # Electron + Vite en desarrollo
npm run electron:dev:server       # idem con SERVER_MODE=true

# server/
npm run dev                       # nodemon src/index.js
npm run migrate                   # knex migrate:latest
npm run seed                      # knex seed:run

# docs/
node generate-pdf.js              # genera documentacion-tecnica.pdf
```

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
