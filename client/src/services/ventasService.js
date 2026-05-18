import api from '../lib/api';
import { savePdf } from '../lib/pdfUtils';

export const getVentas = (params) => api.get('/ventas', { params });
export const getVenta = (id) => api.get(`/ventas/${id}`);
export const crearVenta = (data) => api.post('/ventas', data);
export const confirmarVenta = (id, data) => api.post(`/ventas/${id}/confirmar`, data);
export const anularVenta = (id) => api.post(`/ventas/${id}/anular`);
export const downloadPdf = async (id, cliente, numero) => {
  const res = await api.get(`/ventas/${id}/pdf`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const hoy = new Date();
  const fecha = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`;
  const nombreCliente = (cliente || 'Consumidor_Final').replace(/\s+/g, '_');
  const nro = numero != null ? numero : id;
  const filename = `${nombreCliente}_${fecha}_Comprobante_${nro}.pdf`;
  await savePdf(blob, 'Ventas', filename);
};
export const getPuntosVenta = () => api.get('/afip/puntos-venta');
export const getMediosPago = () => api.get('/medios-pago');
