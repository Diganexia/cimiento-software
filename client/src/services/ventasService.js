import api from '../lib/api';

export const getVentas = (params) => api.get('/ventas', { params });
export const getVenta = (id) => api.get(`/ventas/${id}`);
export const crearVenta = (data) => api.post('/ventas', data);
export const confirmarVenta = (id, data) => api.post(`/ventas/${id}/confirmar`, data);
export const anularVenta = (id) => api.post(`/ventas/${id}/anular`);
export const downloadPdf = async (id, cliente, numero) => {
  const res = await api.get(`/ventas/${id}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  const hoy = new Date();
  const fecha = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`;
  const nombreCliente = (cliente || 'Consumidor_Final').replace(/\s+/g, '_');
  const nro = numero != null ? numero : id;
  a.download = `${nombreCliente}_${fecha}_Comprobante_${nro}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
};
export const getPuntosVenta = () => api.get('/afip/puntos-venta');
export const getMediosPago = () => api.get('/medios-pago');
