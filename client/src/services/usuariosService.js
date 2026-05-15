import api from '../lib/api';

export const getUsuarios = () => api.get('/usuarios');
export const getUsuario = (id) => api.get(`/usuarios/${id}`);
export const createUsuario = (data) => api.post('/usuarios', data);
export const updateUsuario = (id, data) => api.put(`/usuarios/${id}`, data);
export const cambiarPassword = (id, data) => api.put(`/usuarios/${id}/password`, data);
export const getRoles = () => api.get('/usuarios/roles');
