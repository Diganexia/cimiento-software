import api from '../lib/api';
import { savePdf } from '../lib/pdfUtils';

// Clientes
export const getResumenClientes = (params) => api.get('/cta-cte/clientes', { params });
export const getEstadoCuentaCliente = (clienteId, params) => api.get(`/cta-cte/clientes/${clienteId}`, { params });
export const cobrar = (data) => api.post('/cta-cte/clientes/cobro', data);
export const downloadPdfCobro = async (cobroId) => {
  const res = await api.get(`/cta-cte/clientes/cobro/${cobroId}/pdf`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  await savePdf(blob, 'Recibos', `recibo-${cobroId}.pdf`);
};
export const downloadPdfCliente = async (clienteId, nombreCliente) => {
  const res = await api.get(`/cta-cte/clientes/${clienteId}/pdf`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const nombre = (nombreCliente || `cliente-${clienteId}`).replace(/\s+/g, '_');
  const hoy = new Date();
  const fecha = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`;
  await savePdf(blob, 'Estado_Cuenta', `Estado_Cuenta_${nombre}_${fecha}.pdf`);
};

// Proveedores
export const getResumenProveedores = (params) => api.get('/cta-cte/proveedores', { params });
export const getEstadoCuentaProveedor = (proveedorId, params) => api.get(`/cta-cte/proveedores/${proveedorId}`, { params });
export const pagar = (data) => api.post('/cta-cte/proveedores/pago', data);
export const downloadPdfProveedor = async (proveedorId, nombreProveedor) => {
  const res = await api.get(`/cta-cte/proveedores/${proveedorId}/pdf`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const nombre = (nombreProveedor || `proveedor-${proveedorId}`).replace(/\s+/g, '_');
  const hoy = new Date();
  const fecha = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`;
  await savePdf(blob, 'Estado_Cuenta', `Estado_Cuenta_${nombre}_${fecha}.pdf`);
};

// Cuotas
export const getCuotas = (params) => api.get('/cta-cte/cuotas', { params });
export const pagarCuota = (id, data) => api.put(`/cta-cte/cuotas/${id}/pagar`, data);
