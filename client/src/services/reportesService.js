import api from '../lib/api';

export const getKPIs = () => api.get('/reportes/kpis');

export const getVentasPeriodo = (params) => api.get('/reportes/ventas-periodo', { params });
export const getRankingProductos = (params) => api.get('/reportes/ranking-productos', { params });
export const getStockValorizado = (params) => api.get('/reportes/stock-valorizado', { params });
export const getRotacionStock = (params) => api.get('/reportes/rotacion-stock', { params });
export const getKardex = (productoId, params) => api.get(`/reportes/kardex/${productoId}`, { params });
export const getDeudoresClientes = () => api.get('/reportes/deudores-clientes');
export const getComprobantesAfip = (params) => api.get('/reportes/comprobantes-afip', { params });

async function downloadFile(url, params, filename) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const href = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = href; a.download = filename; a.click();
  window.URL.revokeObjectURL(href);
}

export const downloadPDF = (path, params, filename) =>
  downloadFile(path, { ...params, format: 'pdf' }, filename);

export const downloadCSV = (path, params, filename) =>
  downloadFile(path, { ...params, format: 'csv' }, filename);
