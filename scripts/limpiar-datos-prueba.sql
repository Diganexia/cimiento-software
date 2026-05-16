-- ══════════════════════════════════════════════════════════════════
-- LIMPIEZA DE DATOS DE PRUEBA — Ferretería / Corralón Software
-- Elimina los datos hardcodeados del seed inicial y deja solo:
--   · Roles (Administrador, Vendedor, Cajero, Depósito)
--   · Usuario admin
--   · Unidades de medida base
--   · Depósito Principal / Caja Principal / Medios de pago
-- ══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. PRODUCTOS DE PRUEBA ───────────────────────────────────────
-- Códigos de los 10 productos del seed: HIE-12, CEM-50, TOR-M6,
-- PVC-4, PIN-4L, CAB-25, LAD-1K, DIS-45, LED-18, AIS-20

-- Movimientos de stock de esos productos
DELETE FROM movimientos_stock
WHERE producto_id IN (
  SELECT id FROM productos
  WHERE codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                   'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);

-- Comprobantes AFIP de ventas que incluyan esos productos
DELETE FROM comprobantes_afip
WHERE venta_id IN (
  SELECT DISTINCT vi.venta_id
  FROM ventas_items vi
  JOIN productos p ON p.id = vi.producto_id
  WHERE p.codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                     'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);

-- Cuotas de ventas que incluyan esos productos
DELETE FROM cuotas_cliente
WHERE venta_id IN (
  SELECT DISTINCT vi.venta_id
  FROM ventas_items vi
  JOIN productos p ON p.id = vi.producto_id
  WHERE p.codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                     'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);

-- Movimientos de cta cte de ventas con esos productos
DELETE FROM cuenta_corriente_clientes
WHERE venta_id IN (
  SELECT DISTINCT vi.venta_id
  FROM ventas_items vi
  JOIN productos p ON p.id = vi.producto_id
  WHERE p.codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                     'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);

-- Items de venta con esos productos
DELETE FROM ventas_items
WHERE producto_id IN (
  SELECT id FROM productos
  WHERE codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                   'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);

-- Movimientos de cta cte proveedor de compras con esos productos
DELETE FROM cuenta_corriente_proveedores
WHERE compra_id IN (
  SELECT DISTINCT ci.compra_id
  FROM compras_items ci
  JOIN productos p ON p.id = ci.producto_id
  WHERE p.codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                     'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);

-- Items de compra con esos productos
DELETE FROM compras_items
WHERE producto_id IN (
  SELECT id FROM productos
  WHERE codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                   'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20')
);

-- Finalmente los productos (stock_por_deposito se borra en CASCADE)
DELETE FROM productos
WHERE codigo IN ('HIE-12','CEM-50','TOR-M6','PVC-4','PIN-4L',
                 'CAB-25','LAD-1K','DIS-45','LED-18','AIS-20');


-- ─── 2. CLIENTES DE PRUEBA ────────────────────────────────────────
-- Juan Pérez, Constructora Los Pinos SRL, Miguel Torres

-- Comprobantes AFIP de ventas de esos clientes
DELETE FROM comprobantes_afip
WHERE venta_id IN (
  SELECT id FROM ventas
  WHERE cliente_id IN (
    SELECT id FROM clientes
    WHERE nombre IN ('Juan Pérez','Constructora Los Pinos SRL','Miguel Torres')
  )
);

-- Cuotas de esos clientes
DELETE FROM cuotas_cliente
WHERE cliente_id IN (
  SELECT id FROM clientes
  WHERE nombre IN ('Juan Pérez','Constructora Los Pinos SRL','Miguel Torres')
);

-- Movimientos de cta cte de esos clientes
DELETE FROM cuenta_corriente_clientes
WHERE cliente_id IN (
  SELECT id FROM clientes
  WHERE nombre IN ('Juan Pérez','Constructora Los Pinos SRL','Miguel Torres')
);

-- Ventas de esos clientes (ventas_items se borra en CASCADE)
DELETE FROM ventas
WHERE cliente_id IN (
  SELECT id FROM clientes
  WHERE nombre IN ('Juan Pérez','Constructora Los Pinos SRL','Miguel Torres')
);

-- Clientes
DELETE FROM clientes
WHERE nombre IN ('Juan Pérez','Constructora Los Pinos SRL','Miguel Torres');


-- ─── 3. PROVEEDORES DE PRUEBA ─────────────────────────────────────
-- Distribuidora Norte SA (CUIT 30-61234567-9)
-- Materiales del Sur SRL (CUIT 30-51234567-0)

-- Movimientos de cta cte de esos proveedores
DELETE FROM cuenta_corriente_proveedores
WHERE proveedor_id IN (
  SELECT id FROM proveedores
  WHERE cuit IN ('30-61234567-9','30-51234567-0')
);

-- Compras de esos proveedores (compras_items se borra en CASCADE)
DELETE FROM compras
WHERE proveedor_id IN (
  SELECT id FROM proveedores
  WHERE cuit IN ('30-61234567-9','30-51234567-0')
);

-- Proveedores
DELETE FROM proveedores
WHERE cuit IN ('30-61234567-9','30-51234567-0');


-- ─── 4. RUBROS DE PRUEBA ──────────────────────────────────────────
-- Primero los hijos (para evitar rubro_padre_id huérfanos)
DELETE FROM rubros
WHERE nombre IN (
  'Hierros y aceros','Cemento y mezclas','Ladrillos y bloques',
  'Tornillos','Herramientas'
);

-- Luego los padres
DELETE FROM rubros
WHERE nombre IN (
  'Materiales de construcción','Ferretería general',
  'Electricidad','Plomería','Pinturas'
);


-- ─── VERIFICACIÓN ─────────────────────────────────────────────────
-- Opcional: descomentar para ver el estado final antes del COMMIT
-- SELECT 'clientes'   AS tabla, count(*) FROM clientes
-- UNION ALL SELECT 'proveedores', count(*) FROM proveedores
-- UNION ALL SELECT 'productos',   count(*) FROM productos
-- UNION ALL SELECT 'rubros',      count(*) FROM rubros;

COMMIT;
