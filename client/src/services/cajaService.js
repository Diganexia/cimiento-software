import api from '../lib/api';

export const getCajas = () => api.get('/cajas');
export const crearCaja = (data) => api.post('/cajas', data);
export const abrirCaja = (data) => api.post('/cajas/abrir', data);
export const cerrarCaja = (data) => api.post('/cajas/cerrar', data);
export const getArqueoActual = () => api.get('/cajas/arqueo-actual');
export const getArqueos = (params) => api.get('/cajas/arqueos', { params });
export const getArqueo = (id) => api.get(`/cajas/arqueos/${id}`);
export const movimientoManual = (data) => api.post('/cajas/movimiento-manual', data);

export const downloadPdfArqueo = async (id) => {
  const url = id === 'actual' ? '/cajas/arqueo-actual/pdf' : `/cajas/arqueos/${id}/pdf`;
  const res = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `arqueo-${id}.pdf`;
  a.click();
  window.URL.revokeObjectURL(blobUrl);
};
