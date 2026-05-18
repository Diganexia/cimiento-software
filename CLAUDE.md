# Ferretería Software — CLAUDE.md

Sistema de gestión POS/ERP para ferreterías y corralones. Cliente final: Luciano. Desarrollado por Lautaro (Diganexia).

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
     "client/dist-electron/unified/Corralon-Setup-X.Y.Z.exe" \
     "client/dist-electron/unified/Corralon-Setup-X.Y.Z.exe.blockmap" \
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

### Tabla de stock
Se llama `stock_por_deposito`, no `stock`.

### Knex en PostgreSQL
Siempre usar `.returning('*')` en INSERT/UPDATE. Sin esto devuelve objeto no iterable.

### Números de venta
Calculados con `MAX(numero)+1` dentro de transacción protegida con `pg_advisory_xact_lock(1)`. Constraint UNIQUE en `ventas.numero`. No usar sequences (el rollback debe liberar el número).

### Dark mode
`darkMode: 'class'` en `tailwind.config.js`. Toggle en Sidebar. Login/Splash/Setup excluidos. CSS global en `index.css` cubre form elements.

## Repo GitHub

https://github.com/Diganexia/cimiento-software (cuenta Diganexia) — antes: ferreteria-software
