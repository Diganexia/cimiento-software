import api from '../lib/api';
import { savePdf } from '../lib/pdfUtils';

export const getCompras       = (params) => api.get('/compras', { params });
export const getCompra        = (id)     => api.get(`/compras/${id}`);
export const createCompra     = (data)   => api.post('/compras', data);
export const updateCompra     = (id, data) => api.put(`/compras/${id}`, data);
export const confirmarCompra  = (id)     => api.put(`/compras/${id}/confirmar`);
export const downloadCompraPDF = async (id, proveedor, nroRemito) => {
  const res = await api.get(`/compras/${id}/pdf`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const hoy = new Date();
  const fecha = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`;
  const prov = (proveedor || 'Proveedor').replace(/\s+/g, '_');
  const ref = nroRemito ? `_Remito_${nroRemito}` : `_${id}`;
  const filename = `Compra_${prov}_${fecha}${ref}.pdf`;
  await savePdf(blob, 'Compras', filename);
};
