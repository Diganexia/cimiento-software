import api from '../lib/api';
import { savePdf } from '../lib/pdfUtils';

export const getFacturas           = (params) => api.get('/facturacion', { params });
export const getFactura            = (id)     => api.get(`/facturacion/${id}`);
export const crearFactura          = (data)   => api.post('/facturacion', data);
export const emitirFactura         = (id)     => api.post(`/facturacion/${id}/emitir`);
export const getVentasDisponibles  = (params) => api.get('/facturacion/ventas-disponibles', { params });

export async function downloadFacturaPdf(id, clienteNombre, numero) {
  const { data } = await api.get(`/facturacion/${id}/pdf`, { responseType: 'blob' });
  const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
  const nombre = clienteNombre ? clienteNombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '_') : 'ConsumidorFinal';
  const filename = `${nombre}_${fecha}_Factura_${String(numero).padStart(8, '0')}.pdf`;
  await savePdf(data, 'facturas', filename);
}
