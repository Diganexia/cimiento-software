import api from '../lib/api';

export const getStock        = (params) => api.get('/stock', { params });
export const getMovimientos  = (params) => api.get('/stock/movimientos', { params });
export const transferir      = (data)   => api.post('/stock/transferencia', data);
export const ajustar         = (data)   => api.post('/stock/ajuste', data);
export const getDepositos    = ()       => api.get('/depositos');
export const getAlertas      = ()       => api.get('/alertas/stock');
export const abrirInventario       = (data)  => api.post('/inventario', data);
export const getInventario         = (id)    => api.get(`/inventario/${id}`);
export const updateInventarioItems = (id, items) => api.put(`/inventario/${id}/items`, { items });
export const confirmarInventario   = (id)    => api.post(`/inventario/${id}/confirmar`);
export const cancelarInventario    = (id)    => api.delete(`/inventario/${id}`);
