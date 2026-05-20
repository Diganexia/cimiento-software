import api from '../lib/api';

export const getUsuarios = () => api.get('/usuarios');
export const getUsuario = (id) => api.get(`/usuarios/${id}`);
export const createUsuario = (data) => api.post('/usuarios', data);
export const updateUsuario = (id, data) => api.put(`/usuarios/${id}`, data);
export const cambiarPassword = (id, data) => api.put(`/usuarios/${id}/password`, data);
export const getRoles = () => api.get('/usuarios/roles');
export const getRol = (id) => api.get(`/usuarios/roles/${id}`);
export const createRol = (data) => api.post('/usuarios/roles', data);
export const updateRol = (id, data) => api.put(`/usuarios/roles/${id}`, data);
export const deleteRol = (id) => api.delete(`/usuarios/roles/${id}`);
