import api from '../lib/api';

export const getVentas = (params) => api.get('/ventas', { params });
export const getVenta = (id) => api.get(`/ventas/${id}`);
export const crearVenta = (data) => api.post('/ventas', data);
export const confirmarVenta = (id, data) => api.post(`/ventas/${id}/confirmar`, data);
export const anularVenta = (id) => api.post(`/ventas/${id}/anular`);
export const downloadPdf = async (id) => {
  const res = await api.get(`/ventas/${id}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `venta-${id}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
};
export const getPuntosVenta = () => api.get('/afip/puntos-venta');
export const getMediosPago = () => api.get('/medios-pago');
