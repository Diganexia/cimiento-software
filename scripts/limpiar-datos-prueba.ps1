# ══════════════════════════════════════════════════════════════════
# LIMPIEZA DE DATOS DE PRUEBA — Ferretería / Corralón Software
# Ejecutar con: Clic derecho → Ejecutar con PowerShell
# Requiere que la aplicación "Corralon Servidor" esté CERRADA.
# ══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  LIMPIEZA DE DATOS DE PRUEBA - Corralon Software" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ─── 1. Buscar psql.exe en la instalacion ─────────────────────────
$appPaths = @(
    "$env:LOCALAPPDATA\Programs\Corralon Servidor",
    "$env:ProgramFiles\Corralon Servidor",
    "${env:ProgramFiles(x86)}\Corralon Servidor"
)

$psqlExe = $null
foreach ($appPath in $appPaths) {
    $candidate = Join-Path $appPath "resources\app.asar.unpacked\node_modules\@embedded-postgres\windows-x64\native\bin\psql.exe"
    if (Test-Path $candidate) {
        $psqlExe = $candidate
        break
    }
}

if (-not $psqlExe) {
    Write-Host "ERROR: No se encontro psql.exe." -ForegroundColor Red
    Write-Host "Verifique que 'Corralon Servidor' este instalado." -ForegroundColor Red
    Read-Host "Presione Enter para salir"
    exit 1
}

Write-Host "OK  psql encontrado en:" -ForegroundColor Green
Write-Host "    $psqlExe" -ForegroundColor Gray

# ─── 2. Leer contrasena desde app-config.json ─────────────────────
$configPath = "$env:APPDATA\Corralon Servidor\app-config.json"
$dbPassword = "corralon_default_pass_2024"

if (Test-Path $configPath) {
    try {
        $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
        if ($cfg.dbPassword) {
            $dbPassword = $cfg.dbPassword
        }
    } catch {
        Write-Host "AVISO: No se pudo leer app-config.json, usando contrasena por defecto." -ForegroundColor Yellow
    }
} else {
    Write-Host "AVISO: app-config.json no encontrado, usando contrasena por defecto." -ForegroundColor Yellow
}

Write-Host "OK  Configuracion de BD leida." -ForegroundColor Green

# ─── 3. Verificar que la BD este accesible ────────────────────────
$env:PGPASSWORD = $dbPassword

$testResult = & $psqlExe -h 127.0.0.1 -p 5433 -U corralon -d corralon -c "SELECT 1" -t -q 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: No se puede conectar a la base de datos." -ForegroundColor Red
    Write-Host "Asegurese de que la aplicacion 'Corralon Servidor' este ABIERTA" -ForegroundColor Red
    Write-Host "para que la BD este corriendo, luego vuelva a ejecutar este script." -ForegroundColor Red
    Write-Host ""
    Read-Host "Presione Enter para salir"
    exit 1
}

Write-Host "OK  Base de datos accesible (puerto 5433)." -ForegroundColor Green

# ─── 4. Confirmar con el usuario ──────────────────────────────────
Write-Host ""
Write-Host "Este script va a ELIMINAR los siguientes datos de prueba:" -ForegroundColor Yellow
Write-Host "  - 10 productos (barras de hierro, cemento, tornillos, etc.)" -ForegroundColor Yellow
Write-Host "  -  3 clientes  (Juan Perez, Constructora Los Pinos, Miguel Torres)" -ForegroundColor Yellow
Write-Host "  -  2 proveedores (Distribuidora Norte SA, Materiales del Sur SRL)" -ForegroundColor Yellow
Write-Host "  - 10 rubros    (Materiales de construccion, Ferreteria general, etc.)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Se CONSERVAN: roles, usuario admin, unidades de medida," -ForegroundColor Green
Write-Host "              Deposito Principal, Caja Principal, medios de pago." -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Escriba SI para continuar (cualquier otra cosa cancela)"
if ($confirm -ne "SI") {
    Write-Host "Operacion cancelada." -ForegroundColor Yellow
    exit 0
}

# ─── 5. SQL de limpieza ───────────────────────────────────────────
$sql = @'
BEGIN;

-- Productos de prueba (movimientos, ventas, compras)
DELETE FROM movimientos_stock
WHERE producto_id IN (
  SELECT id FROM productos
  WHERE codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                   'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);
DELETE FROM comprobantes_afip
WHERE venta_id IN (
  SELECT DISTINCT vi.venta_id FROM ventas_items vi
  JOIN productos p ON p.id = vi.producto_id
  WHERE p.codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                     'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);
DELETE FROM cuotas_cliente
WHERE venta_id IN (
  SELECT DISTINCT vi.venta_id FROM ventas_items vi
  JOIN productos p ON p.id = vi.producto_id
  WHERE p.codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                     'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);
DELETE FROM cuenta_corriente_clientes
WHERE venta_id IN (
  SELECT DISTINCT vi.venta_id FROM ventas_items vi
  JOIN productos p ON p.id = vi.producto_id
  WHERE p.codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                     'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);
DELETE FROM ventas_items
WHERE producto_id IN (
  SELECT id FROM productos
  WHERE codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                   'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);
DELETE FROM cuenta_corriente_proveedores
WHERE compra_id IN (
  SELECT DISTINCT ci.compra_id FROM compras_items ci
  JOIN productos p ON p.id = ci.producto_id
  WHERE p.codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                     'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);
DELETE FROM compras_items
WHERE producto_id IN (
  SELECT id FROM productos
  WHERE codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                   'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);
DELETE FROM productos
WHERE codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                 'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20');

-- Clientes de prueba
DELETE FROM comprobantes_afip
WHERE venta_id IN (
  SELECT id FROM ventas WHERE cliente_id IN (
    SELECT id FROM clientes
    WHERE nombre IN ('Juan Pérez','Constructora Los Pinos SRL','Miguel Torres')
  )
);
DELETE FROM cuotas_cliente
WHERE cliente_id IN (
  SELECT id FROM clientes
  WHERE nombre IN ('Juan Pérez','Constructora Los Pinos SRL','Miguel Torres')
);
DELETE FROM cuenta_corriente_clientes
WHERE cliente_id IN (
  SELECT id FROM clientes
  WHERE nombre IN ('Juan Pérez','Constructora Los Pinos SRL','Miguel Torres')
);
DELETE FROM ventas
WHERE cliente_id IN (
  SELECT id FROM clientes
  WHERE nombre IN ('Juan Pérez','Constructora Los Pinos SRL','Miguel Torres')
);
DELETE FROM clientes
WHERE nombre IN ('Juan Pérez','Constructora Los Pinos SRL','Miguel Torres');

-- Proveedores de prueba
DELETE FROM cuenta_corriente_proveedores
WHERE proveedor_id IN (
  SELECT id FROM proveedores WHERE cuit IN ('30-61234567-9','30-51234567-0')
);
DELETE FROM compras
WHERE proveedor_id IN (
  SELECT id FROM proveedores WHERE cuit IN ('30-61234567-9','30-51234567-0')
);
DELETE FROM proveedores
WHERE cuit IN ('30-61234567-9','30-51234567-0');

-- Rubros de prueba (hijos primero)
DELETE FROM rubros
WHERE nombre IN (
  'Hierros y aceros','Cemento y mezclas','Ladrillos y bloques',
  'Tornillos','Herramientas'
);
DELETE FROM rubros
WHERE nombre IN (
  'Materiales de construcción','Ferretería general',
  'Electricidad','Plomería','Pinturas'
);

COMMIT;
'@

# ─── 6. Ejecutar ─────────────────────────────────────────────────
Write-Host ""
Write-Host "Ejecutando limpieza..." -ForegroundColor Cyan

$result = $sql | & $psqlExe -h 127.0.0.1 -p 5433 -U corralon -d corralon 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host "  LIMPIEZA COMPLETADA EXITOSAMENTE" -ForegroundColor Green
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Puede reabrir la aplicacion. Los datos de prueba" -ForegroundColor White
    Write-Host "han sido eliminados." -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR durante la limpieza:" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    Write-Host ""
    Write-Host "La transaccion fue revertida. No se modifico ninguna dato." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Presione Enter para salir"
