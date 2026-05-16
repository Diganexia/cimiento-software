import api from '../lib/api';

// Clientes
export const getResumenClientes = (params) => api.get('/cta-cte/clientes', { params });
export const getEstadoCuentaCliente = (clienteId, params) => api.get(`/cta-cte/clientes/${clienteId}`, { params });
export const cobrar = (data) => api.post('/cta-cte/clientes/cobro', data);
export const downloadPdfCobro = async (cobroId) => {
  const res = await api.get(`/cta-cte/clientes/cobro/${cobroId}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `recibo-${cobroId}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
};
export const downloadPdfCliente = async (clienteId) => {
  const res = await api.get(`/cta-cte/clientes/${clienteId}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `cta-cte-cliente-${clienteId}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Proveedores
export const getResumenProveedores = (params) => api.get('/cta-cte/proveedores', { params });
export const getEstadoCuentaProveedor = (proveedorId, params) => api.get(`/cta-cte/proveedores/${proveedorId}`, { params });
export const pagar = (data) => api.post('/cta-cte/proveedores/pago', data);
export const downloadPdfProveedor = async (proveedorId) => {
  const res = await api.get(`/cta-cte/proveedores/${proveedorId}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `cta-cte-proveedor-${proveedorId}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Cuotas
export const getCuotas = (params) => api.get('/cta-cte/cuotas', { params });
export const pagarCuota = (id, data) => api.put(`/cta-cte/cuotas/${id}/pagar`, data);
