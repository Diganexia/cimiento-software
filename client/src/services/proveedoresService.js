import api from '../lib/api';

export const getProveedores  = (params)   => api.get('/proveedores', { params });
export const getProveedor    = (id)       => api.get(`/proveedores/${id}`);
export const createProveedor = (data)     => api.post('/proveedores', data);
export const updateProveedor = (id, data) => api.put(`/proveedores/${id}`, data);
export const deleteProveedor = (id)       => api.delete(`/proveedores/${id}`);
