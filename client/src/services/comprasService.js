import api from '../lib/api';

export const getCompras       = (params) => api.get('/compras', { params });
export const getCompra        = (id)     => api.get(`/compras/${id}`);
export const createCompra     = (data)   => api.post('/compras', data);
export const updateCompra     = (id, data) => api.put(`/compras/${id}`, data);
export const confirmarCompra  = (id)     => api.put(`/compras/${id}/confirmar`);
