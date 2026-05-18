# Cimiento — CLAUDE.md

Sistema de gestión POS/ERP para ferreterías y corralones. Nombre del software: **Cimiento**. Cliente final: Luciano. Desarrollado por Lautaro (Diganexia).

## Stack

- **Frontend:** Electron + React 18 + Vite + Tailwind CSS + Zustand
- **Backend:** Node.js + Express + Knex + PostgreSQL embebido (`embedded-postgres` v18)
- **PDF:** pdfkit (MIT, sin servicios externos)
- **Facturación:** node-afip (solo cuando hay certificados WSFE en `server/certs/`)

## Estructura del monorepo

```
ferreteria-software-master/
  client/         # Electron app (frontend + main process)
    electron/     # main.js, backupManager.js, dbManager.js, ipcHandlers.js
    src/          # React: pages/, components/, services/, store/
  server/         # Express API (corre in-process dentro de Electron)
    src/
      controllers/
      services/   # afipService.js, pdfService.js
      migrations/
```

## Comandos clave

```bash
# Desde client/
npm run electron:dev          # dev con Electron
npm run electron:build        # build completo (unified installer)
```

## Reglas críticas

### package.json — versión
**SIEMPRE usar el Write tool** para editar `client/package.json`. NUNCA usar `PowerShell ConvertTo-Json` — agrega BOM, doble espacio después de `:`, corrompe tildes (UTF-8 → Ã). Eso rompe Vite/PostCSS al buildear.

### winCodeSign
Después de `npm install` en `client/`, reaplicar el patch en `node_modules/app-builder-lib/out/winPackager.js` (ver memory `wincodesign_patch.md`). Sin esto, el build falla en Windows sin Developer Mode.

### Build y release
El usuario dice "buildea y subilo" como comando único. Ejecutar:
1. `npm run electron:build` desde `client/`
2. ```
   gh release create vX.Y.Z \
     "client/dist-electron/unified/Cimiento-Setup-X.Y.Z.exe" \
     "client/dist-electron/unified/Cimiento-Setup-X.Y.Z.exe.blockmap" \
     "client/dist-electron/unified/latest.yml"
   ```

**CRÍTICO:** Subir siempre los 3 archivos: `.exe`, `.exe.blockmap` y `latest.yml`. Sin `latest.yml`, el auto-updater no puede detectar nuevas versiones.

No pedir confirmación intermedia.

### Git
Pushear directo a `main`. No abrir PRs.

## Decisiones de arquitectura (no obvias)

### Backup sin pg_dump
`embedded-postgres` v18 solo instala pg_ctl/postgres/initdb, no pg_dump. `backupManager.js` usa `pg.Client` directamente. Formato `.json`. No tocar esta decisión buscando pg_dump.

### Modo servidor/cliente
Detectado en runtime leyendo `app-config.json` en userData (`%APPDATA%\ferreteria-client`). El modo se elige en el primer arranque (Setup.jsx). Discovery de servidor vía UDP broadcast puerto 45678.

### ARCA (ex-AFIP)
- Labels de usuario: siempre "ARCA"
- Variables internas/env: mantener prefijo AFIP (`AFIP_CUIT`, `REQUIERE_AFIP`) para no romper configs existentes
- `node-afip` v1.0.4 solo tiene consultas de Padrón (no WSFE). Para emitir facturas se necesita certificado en `server/certs/cert.crt` y `private.key`
- Si falla ARCA, la venta se confirma igual (no bloqueante). Error queda en `comprobantes.estado='error'` y se muestra en frontend como banner amarillo

### Caja obligatoria en ventas
`_confirmar` en `ventasController.js` valida al inicio que haya arqueo `estado='abierto'`. Sin caja abierta, ninguna venta puede confirmarse.

### Restauración de sesión al reiniciar
`authStore.usuario` no persiste en localStorage (solo el token). `ProtectedRoute.jsx` llama `GET /auth/me` al montar si tiene token pero `usuario===null`. Muestra `null` mientras carga. Si el token expiró, `clearAuth()` y redirige a login.

### Tabla de stock
Se llama `stock_por_deposito`, no `stock`.

### Knex en PostgreSQL
Siempre usar `.returning('*')` en INSERT/UPDATE. Sin esto devuelve objeto no iterable.

### Números de venta
Calculados con `MAX(numero)+1` dentro de transacción protegida con `pg_advisory_xact_lock(1)`. Constraint UNIQUE en `ventas.numero`. No usar sequences (el rollback debe liberar el número).

### Dark mode
`darkMode: 'class'` en `tailwind.config.js`. Toggle como pill con iconos sol/luna en la página de **Configuración** (no en Sidebar). **Login también aplica dark mode** — tiene `dark:` classes en todos sus elementos; no forzar remoción de la clase `dark` en Login. Splash/Setup excluidos del dark mode. CSS global en `index.css` cubre form elements. Cards/banners de color usan `dark:bg-COLOR-900/20`.

### PDF — guardado en Documents
PDFs se guardan via IPC en `Documents/Cimiento/{tipo}/{DD-MM-YYYY}/` usando `app.getPath('documents')`. Handler `save-pdf` en `main.js` (dentro de `registerUniversalAsyncIPC`). Helper `client/src/lib/pdfUtils.js` expone `savePdf(blob, tipo, filename)` — en Electron usa `window.electronAPI.savePdf()`, en browser hace download con anchor. `preload.js` expone `savePdf` vía contextBridge. Después de guardar, `shell.openPath()` abre el archivo automáticamente. El buffer se transfiere como `ArrayBuffer` vía IPC; en main.js usar `Buffer.from(buffer)` para escribirlo.

### PDF — convenciones de nombre y tipografía
- Ventas: `{Cliente}_{DD-MM-YYYY}_Comprobante_{N}.pdf`
- Estado de cuenta: `Estado_Cuenta_{Nombre}_{DD-MM-YYYY}.pdf`
- Campo "Impreso:" incluye hora: `${fechaImpresion} ${horaImpresion}` (HH:MM)
- Fuentes: todas las fontSizes de `pdfService.js` están +3pt respecto al baseline original
- Footers anclados con `doc.page.height - doc.page.margins.bottom - 14` (NO y fijo como 800/810 — excedería el margen A4 y generaría segunda página)

### Branding — Cimiento
- Nombre visible: **Cimiento** (productName, artifactName, UI, título barra de Windows)
- `appId`: sigue siendo `com.ferreteria.app` — NO cambiar o rompe auto-update de installs existentes
- `name` en package.json: sigue siendo `ferreteria-client` — determina `%APPDATA%\ferreteria-client` (userData path)
- DB PostgreSQL user/name: sigue siendo `corralon` — NO cambiar o rompe installs existentes
- Protocolo UDP discovery: sigue usando strings `CORRALON_DISCOVER` / `CORRALON_SERVER` — compatibilidad con clientes en campo
- Título barra Windows: `title: 'Cimiento'` en BrowserWindow + `mainWindow.on('page-title-updated', e => e.preventDefault())` en main.js. `index.html` tiene el título correcto pero está en .gitignore — el fix de main.js es suficiente en runtime.

### Configuración — SimpleListTab
`SimpleListTab` acepta `editFields` (array o función de items) para campos distintos al crear vs editar. `booleanFields` (array de keys) se convierten de string a boolean antes del update. `InlineForm` convierte a string los valores de campos `type:'select'` al inicializar (para que IDs integer matcheen options string).

## Repo GitHub

https://github.com/Diganexia/cimiento-software (cuenta Diganexia)
Antes: ferreteria-software — GitHub redirige automáticamente.
