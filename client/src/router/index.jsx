import { createHashRouter } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import Productos from '../pages/stock/Productos';
import ProductoForm from '../pages/stock/ProductoForm';
import StockView from '../pages/stock/StockView';
import Movimientos from '../pages/stock/Movimientos';
import Transferencia from '../pages/stock/Transferencia';
import Inventario from '../pages/stock/Inventario';
import Ajuste from '../pages/stock/Ajuste';
import Compras from '../pages/compras/Compras';
import CompraForm from '../pages/compras/CompraForm';
import CompraDetalle from '../pages/compras/CompraDetalle';
import Proveedores from '../pages/proveedores/Proveedores';
import ProveedorForm from '../pages/proveedores/ProveedorForm';
import Clientes from '../pages/clientes/Clientes';
import ClienteForm from '../pages/clientes/ClienteForm';
import VentasCliente from '../pages/clientes/VentasCliente';
import PuntoVenta from '../pages/ventas/PuntoVenta';
import Ventas from '../pages/ventas/Ventas';
import VentaDetalle from '../pages/ventas/VentaDetalle';
import Caja from '../pages/tesoreria/Caja';
import Arqueos from '../pages/tesoreria/Arqueos';
import ArqueoDetalle from '../pages/tesoreria/ArqueoDetalle';
import CtaCteClientes from '../pages/ctacte/CtaCteClientes';
import CtaCteCliente from '../pages/ctacte/CtaCteCliente';
import CtaCteProveedores from '../pages/ctacte/CtaCteProveedores';
import CtaCteProveedor from '../pages/ctacte/CtaCteProveedor';
import Cuotas from '../pages/ctacte/Cuotas';
import Usuarios from '../pages/configuracion/Usuarios';
import UsuarioForm from '../pages/configuracion/UsuarioForm';
import Configuracion from '../pages/configuracion/Configuracion';
import Reportes from '../pages/reportes/Reportes';
import Splash from '../pages/Splash';
import ServerConfig from '../pages/ServerConfig';
import Backup from '../pages/configuracion/Backup';

const router = createHashRouter([
  { path: '/splash', element: <Splash /> },
  { path: '/server-config', element: <ServerConfig /> },
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'stock/productos', element: <Productos /> },
          { path: 'stock/productos/nuevo', element: <ProductoForm /> },
          { path: 'stock/productos/:id/editar', element: <ProductoForm /> },
          { path: 'stock/vista', element: <StockView /> },
          { path: 'stock/movimientos', element: <Movimientos /> },
          { path: 'stock/transferencia', element: <Transferencia /> },
          { path: 'stock/ajuste', element: <Ajuste /> },
          { path: 'stock/inventario', element: <Inventario /> },
          { path: 'compras',               element: <Compras /> },
          { path: 'compras/nueva',         element: <CompraForm /> },
          { path: 'compras/:id',           element: <CompraDetalle /> },
          { path: 'compras/:id/editar',    element: <CompraForm /> },
          { path: 'proveedores',           element: <Proveedores /> },
          { path: 'proveedores/nuevo',     element: <ProveedorForm /> },
          { path: 'proveedores/:id/editar',element: <ProveedorForm /> },
          { path: 'clientes',                    element: <Clientes /> },
          { path: 'clientes/nuevo',              element: <ClienteForm /> },
          { path: 'clientes/:id/editar',         element: <ClienteForm /> },
          { path: 'clientes/:clienteId/ventas',  element: <VentasCliente /> },
          { path: 'ventas',                element: <Ventas /> },
          { path: 'ventas/nueva',          element: <PuntoVenta /> },
          { path: 'ventas/:id',            element: <VentaDetalle /> },
          { path: 'tesoreria/caja',              element: <Caja /> },
          { path: 'tesoreria/arqueos',           element: <Arqueos /> },
          { path: 'tesoreria/arqueos/:id',       element: <ArqueoDetalle /> },
          { path: 'cta-cte/clientes',               element: <CtaCteClientes /> },
          { path: 'cta-cte/clientes/:clienteId',    element: <CtaCteCliente /> },
          { path: 'cta-cte/proveedores',            element: <CtaCteProveedores /> },
          { path: 'cta-cte/proveedores/:proveedorId', element: <CtaCteProveedor /> },
          { path: 'cta-cte/cuotas',                 element: <Cuotas /> },
          { path: 'reportes',                      element: <Reportes /> },
          { path: 'configuracion',                 element: <Configuracion /> },
          { path: 'configuracion/usuarios',        element: <Usuarios /> },
          { path: 'configuracion/usuarios/nuevo',  element: <UsuarioForm /> },
          { path: 'configuracion/usuarios/:id/editar', element: <UsuarioForm /> },
          { path: 'configuracion/backup',              element: <Backup /> }
        ]
      }
    ]
  }
]);

export default router;
