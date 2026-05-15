const PERMISOS = {
  Administrador: { all: true },
  Vendedor: {
    productos: { ver: true, crear: false, editar: false, eliminar: false },
    stock: { ver: true, ajustar: false, transferir: false, inventario: false },
    ventas: { ver: true, crear: true, anular: false },
    compras: { ver: false, crear: false, confirmar: false },
    clientes: { ver: true, crear: true, editar: true },
    proveedores: { ver: false, crear: false, editar: false },
    caja: { abrir: false, cerrar: false, ver_movimientos: false },
    cta_cte: { ver: true, cobrar: false, pagar: false },
    usuarios: { ver: false, crear: false, editar: false },
    reportes: { ver: false },
    configuracion: { ver: false, editar: false }
  },
  Cajero: {
    productos: { ver: true, crear: false, editar: false, eliminar: false },
    stock: { ver: true, ajustar: false, transferir: false, inventario: false },
    ventas: { ver: true, crear: true, anular: false },
    compras: { ver: false, crear: false, confirmar: false },
    clientes: { ver: true, crear: true, editar: false },
    proveedores: { ver: false, crear: false, editar: false },
    caja: { abrir: true, cerrar: true, ver_movimientos: true },
    cta_cte: { ver: true, cobrar: true, pagar: false },
    usuarios: { ver: false, crear: false, editar: false },
    reportes: { ver: true },
    configuracion: { ver: false, editar: false }
  },
  Depósito: {
    productos: { ver: true, crear: true, editar: true, eliminar: false },
    stock: { ver: true, ajustar: true, transferir: true, inventario: true },
    ventas: { ver: false, crear: false, anular: false },
    compras: { ver: true, crear: true, confirmar: true },
    clientes: { ver: false, crear: false, editar: false },
    proveedores: { ver: true, crear: true, editar: true },
    caja: { abrir: false, cerrar: false, ver_movimientos: false },
    cta_cte: { ver: false, cobrar: false, pagar: true },
    usuarios: { ver: false, crear: false, editar: false },
    reportes: { ver: true },
    configuracion: { ver: false, editar: false }
  }
};

module.exports = PERMISOS;
