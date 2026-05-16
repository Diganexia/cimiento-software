# Plan de acción — Sistema de gestión correalón/ferretería
> Ejecutar con Claude Code siguiendo el orden de fases. Cada tarea es atómica y verificable.
> **Todo el stack es 100% gratuito y open source. No usar ningún servicio pago.**

---

## Stack definido
- **Frontend:** Electron + React + Vite + TailwindCSS + Zustand + React Router
- **Backend:** Node.js + Express + JWT + Knex.js
- **Base de datos:** PostgreSQL
- **Arquitectura:** Cliente-servidor en red LAN

---

## Dependencias aprobadas (todas MIT / open source / gratuitas)

| Paquete | Uso | Licencia |
|---|---|---|
| `electron` | Shell desktop | MIT |
| `react` + `react-dom` | UI | MIT |
| `vite` | Bundler frontend | MIT |
| `tailwindcss` | Estilos | MIT |
| `zustand` | Estado global | MIT |
| `react-router-dom` | Navegación | MIT |
| `express` | Servidor HTTP | MIT |
| `jsonwebtoken` | Auth JWT | MIT |
| `bcryptjs` | Hash de contraseñas | MIT |
| `knex` | Query builder / migraciones | MIT |
| `pg` | Driver PostgreSQL | MIT |
| `dotenv` | Variables de entorno | MIT |
| `cors` | CORS middleware | MIT |
| `helmet` | Seguridad HTTP headers | MIT |
| `pdfkit` | Generación de PDFs | MIT |
| `node-afip` | Integración AFIP (WSFE/WSAA) | MIT |
| `electron-builder` | Empaquetado instalador .exe | MIT |
| `embedded-postgres` | PostgreSQL portable (sin instalación manual) | MIT |
| `pg_dump` | Backup de base de datos | PostgreSQL License (incluido en embedded) |

> **AFIP:** usar exclusivamente `node-afip` directo contra el web service de AFIP.
> Prohibido usar servicios intermediarios pagos (TusFacturas, Facturación en la Nube, etc.).

---

## Estrategia de instalación

El sistema genera **dos instaladores `.exe`** con `electron-builder`:

### `corralon-server-setup.exe`
Se instala en **una sola PC** que actúa como servidor de la red.
Incluye todo:
- Electron + React (interfaz completa)
- Node.js + Express embebido (proceso hijo del main process de Electron)
- PostgreSQL portable via `embedded-postgres` (sin instalación manual)
- Script de primer arranque: inicializa la DB, crea tablas, carga seeds
- Inicia automáticamente el servidor Express al abrir la app
- Muestra la IP local en pantalla para que las otras PCs puedan conectarse

### `corralon-client-setup.exe`
Se instala en **cada PC adicional** de la red.
Incluye solo:
- Electron + React
- Pantalla de configuración inicial: ingresar IP del servidor
- Guarda la IP en archivo local de configuración
- Toda la lógica corre en el servidor — el cliente es solo UI

### Flujo de primer arranque (servidor)
1. Usuario ejecuta `corralon-server-setup.exe` → instala en `C:\Program Files\Corralon`
2. Al abrir por primera vez: `embedded-postgres` descomprime y arranca PostgreSQL en puerto 5433
3. Knex ejecuta todas las migraciones automáticamente
4. Se cargan los seeds (roles, admin inicial, datos base)
5. Express arranca en puerto 3001
6. La app muestra: "Sistema listo. IP del servidor: 192.168.x.x"
7. En las PCs cliente: instalar `corralon-client-setup.exe` e ingresar esa IP

---

## Fase 1 — Infraestructura base del proyecto

### 1.1 Scaffolding inicial
- [ ] Crear monorepo con estructura `/client` (Electron+React) y `/server` (Node+Express)
- [ ] Inicializar `package.json` en raíz con workspaces
- [ ] Configurar `/server`: Express + Knex + pg + dotenv + cors + helmet
- [ ] Configurar `/client`: Vite + React + TailwindCSS + Zustand + React Router
- [ ] Configurar Electron en `/client` con main process y preload script
- [ ] Configurar variables de entorno (`.env.example` con `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `JWT_SECRET`, `PORT`)
- [ ] Agregar `.gitignore` apropiado

### 1.2 Base de datos — Migraciones
- [ ] Configurar Knex con migraciones y seeds
- [ ] Migración 001: tablas de soporte (`roles`, `usuarios`, `unidades_medida`)
- [ ] Migración 002: catálogo (`rubros`, `productos`, `proveedores`)
- [ ] Migración 003: stock (`depositos`, `stock_por_deposito`, `movimientos_stock`)
- [ ] Migración 004: ventas (`clientes`, `ventas`, `ventas_items`)
- [ ] Migración 005: compras (`compras`, `compras_items`)
- [ ] Migración 006: tesorería (`cajas`, `arqueos`, `medios_pago`, `movimientos_caja`)
- [ ] Migración 007: cuentas corrientes (`cuenta_corriente_clientes`, `cuenta_corriente_proveedores`, `cuotas_cliente`)
- [ ] Migración 008: AFIP (`puntos_venta_afip`, `comprobantes_afip`)
- [ ] Seed: roles base (Administrador, Vendedor, Cajero, Depósito)
- [ ] Seed: usuario administrador inicial (`admin` / `admin1234`)
- [ ] Seed: datos de prueba (10 productos, 3 clientes, 2 proveedores)

### 1.3 Autenticación y autorización
- [ ] Endpoint `POST /api/auth/login` — devuelve JWT
- [ ] Endpoint `POST /api/auth/logout`
- [ ] Endpoint `GET /api/auth/me` — devuelve usuario actual
- [ ] Middleware `authenticateToken` — valida JWT en cada request
- [ ] Middleware `authorize(permiso)` — verifica permisos del rol
- [ ] Definir estructura de permisos en JSON por rol
- [ ] En cliente: pantalla de login con validación
- [ ] En cliente: guardar token en Zustand + localStorage
- [ ] En cliente: HOC `ProtectedRoute` que redirige si no hay sesión
- [ ] En cliente: mostrar/ocultar elementos de UI según permisos del rol

---

## Fase 2 — Módulo de stock

### 2.1 ABM de productos
- [ ] `GET /api/productos` — listado con filtros (rubro, activo, búsqueda por texto/código de barra)
- [ ] `GET /api/productos/:id` — detalle
- [ ] `POST /api/productos` — crear
- [ ] `PUT /api/productos/:id` — editar
- [ ] `DELETE /api/productos/:id` — baja lógica (`activo = false`)
- [ ] `GET /api/rubros` — árbol de rubros
- [ ] `GET /api/unidades-medida` — listado
- [ ] Pantalla: listado de productos con búsqueda, filtros y paginación
- [ ] Pantalla: formulario crear/editar producto (con selector de rubro, unidad de medida, proveedor habitual)
- [ ] Componente: badge de stock actual (verde/amarillo/rojo según mínimo)

### 2.2 Depósitos y stock
- [ ] `GET /api/depositos` — listado
- [ ] `POST /api/depositos` — crear
- [ ] `PUT /api/depositos/:id` — editar
- [ ] `GET /api/stock` — stock por producto y depósito
- [ ] `POST /api/stock/transferencia` — transferir entre depósitos (genera 2 movimientos)
- [ ] `POST /api/stock/ajuste` — ajuste manual con motivo
- [ ] Pantalla: vista de stock por depósito
- [ ] Pantalla: formulario de transferencia entre depósitos
- [ ] Pantalla: historial de movimientos con filtros (producto, tipo, fecha, usuario)

### 2.3 Inventario físico
- [ ] `POST /api/inventario/abrir` — abre sesión de inventario
- [ ] `PUT /api/inventario/:id/items` — carga conteos por producto
- [ ] `POST /api/inventario/:id/confirmar` — genera ajustes de diferencias
- [ ] Pantalla: flujo de inventario (abrir → contar → revisar diferencias → confirmar)

### 2.4 Alertas de stock
- [ ] Job en servidor: verificar stock mínimo al guardar movimiento
- [ ] `GET /api/alertas/stock` — productos bajo mínimo
- [ ] Componente: banner de alertas en dashboard

---

## Fase 3 — Módulo de compras

- [ ] `GET /api/compras` — listado con filtros
- [ ] `GET /api/compras/:id` — detalle con items
- [ ] `POST /api/compras` — registrar compra (ingresa stock automáticamente)
- [ ] `PUT /api/compras/:id` — editar compra en estado borrador
- [ ] Lógica: al confirmar compra → generar `movimiento_stock` tipo `ENTRADA_COMPRA` por cada item
- [ ] Lógica: al confirmar compra → generar movimiento en `cuenta_corriente_proveedores`
- [ ] Pantalla: listado de compras
- [ ] Pantalla: formulario de carga de compra (buscar producto por código/nombre, agregar items, seleccionar depósito destino)
- [ ] ABM de proveedores (listado + formulario)

---

## Fase 4 — Módulo de ventas y facturación

### 4.1 Punto de venta interno
- [ ] `POST /api/ventas` — crear venta (descuenta stock, genera movimiento caja si pago inmediato)
- [ ] `GET /api/ventas` — listado con filtros
- [ ] `GET /api/ventas/:id` — detalle
- [ ] `PUT /api/ventas/:id/anular` — anular venta (revierte stock)
- [ ] Lógica: al confirmar venta → `movimiento_stock` tipo `SALIDA_VENTA` por item
- [ ] Lógica: elegir tipo de comprobante (remito interno / factura interna / factura AFIP)
- [ ] Lógica: si pago contado → generar `movimiento_caja`
- [ ] Lógica: si cuenta corriente → generar fila en `cuenta_corriente_clientes`
- [ ] Pantalla: punto de venta (buscar cliente, agregar productos por código de barra o nombre, elegir medio de pago)
- [ ] Pantalla: listado de ventas con filtros
- [ ] Componente: impresión de remito / factura interna (PDF con `pdfkit` o similar)
- [ ] ABM de clientes (listado + formulario)

### 4.2 Facturación electrónica AFIP
- [ ] Configurar certificados AFIP (homologación y producción)
- [ ] Servicio `AfipService` con métodos: `autenticar()`, `obtenerUltimoCbte()`, `emitirFactura()`
- [ ] Integración con WSFE (web service de facturación electrónica) via `afip.js` o `node-afip`
- [ ] `POST /api/afip/factura` — emite factura A o B, guarda CAE en `comprobantes_afip`
- [ ] Manejo de errores AFIP: reintentos, estado pendiente si hay timeout
- [ ] Pantalla: emisión de factura electrónica desde una venta existente
- [ ] Componente: impresión de factura electrónica con CAE y código de barras AFIP (formato legal)
- [ ] Pantalla: listado de comprobantes AFIP con estado (emitido / pendiente / error)

---

## Fase 5 — Cuentas corrientes

- [ ] `GET /api/cta-cte/clientes/:clienteId` — estado de cuenta con saldo
- [ ] `POST /api/cta-cte/clientes/cobro` — registrar cobro (genera movimiento caja + actualiza saldo)
- [ ] `GET /api/cta-cte/proveedores/:proveedorId` — estado de cuenta proveedor
- [ ] `POST /api/cta-cte/proveedores/pago` — registrar pago a proveedor
- [ ] Lógica: soporte de cuotas (al vender en cuotas → genera N filas en `cuotas_cliente`)
- [ ] `GET /api/cta-cte/cuotas/vencidas` — cuotas vencidas o próximas a vencer
- [ ] Pantalla: estado de cuenta de cliente (tabla de movimientos + saldo actual)
- [ ] Pantalla: estado de cuenta de proveedor
- [ ] Pantalla: listado de cuotas pendientes / vencidas
- [ ] Componente: impresión de estado de cuenta en PDF

---

## Fase 6 — Tesorería

- [ ] `POST /api/cajas/abrir` — apertura de caja con saldo inicial
- [ ] `POST /api/cajas/cerrar` — cierre con declaración de saldo
- [ ] `GET /api/cajas/arqueo-actual` — estado del arqueo abierto
- [ ] `GET /api/cajas/arqueos` — historial de arqueos
- [ ] `GET /api/cajas/movimientos` — movimientos del arqueo actual con filtros
- [ ] `POST /api/cajas/movimiento-manual` — ingreso/egreso manual (ej: pago de servicio)
- [ ] Lógica: un arqueo debe estar abierto para registrar ventas al contado
- [ ] Pantalla: apertura de caja
- [ ] Pantalla: cierre de caja con resumen por medio de pago y diferencia
- [ ] Pantalla: listado de movimientos del turno actual
- [ ] Componente: impresión de resumen de arqueo

---

## Fase 7 — Usuarios, roles y configuración

- [ ] `GET /api/usuarios` — listado (solo admin)
- [ ] `POST /api/usuarios` — crear usuario
- [ ] `PUT /api/usuarios/:id` — editar (cambiar rol, activar/desactivar)
- [ ] `PUT /api/usuarios/:id/password` — cambiar contraseña
- [ ] Pantalla: ABM de usuarios con selector de rol
- [ ] Pantalla: configuración general (nombre del negocio, CUIT, dirección, logo)
- [ ] Pantalla: configuración de puntos de venta AFIP
- [ ] Pantalla: ABM de depósitos, rubros, unidades de medida, medios de pago

---

## Fase 8 — Reportes

- [ ] Reporte: ventas por período (por día / semana / mes) con gráfico
- [ ] Reporte: ranking de productos más vendidos
- [ ] Reporte: stock valorizado (cantidad × precio costo)
- [ ] Reporte: rotación de stock (productos sin movimiento en N días)
- [ ] Reporte: kardex por producto (historial de movimientos con saldo)
- [ ] Reporte: cuenta corriente consolidada de clientes (deudores)
- [ ] Reporte: comprobantes AFIP emitidos por período
- [ ] Todos los reportes: exportar a PDF y CSV
- [ ] Pantalla: dashboard con KPIs (ventas del día, stock bajo mínimo, caja actual, deudores)

---

## Fase 9 — Empaquetado y deploy

### 9.1 Servidor embebido
- [ ] Integrar `embedded-postgres` en el main process de Electron
- [ ] Lógica de primer arranque: detectar si es primera ejecución, correr migraciones y seeds automáticamente
- [ ] Arrancar proceso hijo de Express desde el main process de Electron
- [ ] Pantalla de splash con estado de inicio (iniciando DB → iniciando servidor → listo)
- [ ] Mostrar IP local del servidor en la UI para facilitar configuración de clientes
- [ ] Manejo de errores de arranque (puerto ocupado, permisos, etc.)

### 9.2 Configuración de red en cliente
- [ ] Pantalla de configuración inicial en cliente: ingresar IP y puerto del servidor
- [ ] Guardar configuración en archivo local (`config.json` en userData de Electron)
- [ ] Botón "probar conexión" antes de guardar
- [ ] Permitir cambiar la IP del servidor desde configuración

### 9.3 Generación de instaladores
- [ ] Configurar `electron-builder` con dos targets: `server` y `client`
- [ ] Build `corralon-server-setup.exe`: incluye binarios de PostgreSQL portable + Node + React
- [ ] Build `corralon-client-setup.exe`: solo Electron + React, sin PostgreSQL ni Express
- [ ] Firmar ejecutables (opcional, evita advertencia de Windows SmartScreen)
- [ ] Configurar auto-updater de Electron (apunta al servidor LAN para actualizaciones)

### 9.4 Backup y mantenimiento
- [ ] Script de backup automático usando `pg_dump` (incluido en `embedded-postgres`)
- [ ] Configurar backup diario automático en carpeta local con retención de 30 días
- [ ] Pantalla de administración: backup manual, restaurar, ver logs

### 9.5 Entrega
- [ ] Testing en red local con 5+ clientes simultáneos
- [ ] Checklist de entrega al cliente
- [ ] Manual de usuario básico (PDF)
- [ ] Guía de instalación paso a paso (PDF)

---

## Notas para Claude Code

- Respetar el orden de fases — las fases posteriores dependen de las anteriores
- Cada endpoint de la API debe tener su middleware de autenticación y autorización
- Todas las operaciones críticas (ventas, compras, movimientos de caja) deben ejecutarse dentro de transacciones de PostgreSQL (`trx` en Knex)
- El servidor Express corre en la PC servidora; los clientes Electron se conectan por IP de red local
- AFIP requiere certificados reales para producción — desarrollar primero en homologación
- Configurar CORS en el servidor para aceptar solo IPs de la red local
