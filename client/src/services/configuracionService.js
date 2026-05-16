import api from '../lib/api';

// Empresa
export const getEmpresa = () => api.get('/configuracion/empresa');
export const updateEmpresa = (data) => api.put('/configuracion/empresa', data);

// Puntos de venta AFIP
export const getPuntosVenta = () => api.get('/configuracion/puntos-venta');
export const createPuntoVenta = (data) => api.post('/configuracion/puntos-venta', data);
export const updatePuntoVenta = (id, data) => api.put(`/configuracion/puntos-venta/${id}`, data);
export const deletePuntoVenta = (id) => api.delete(`/configuracion/puntos-venta/${id}`);

// Rubros
export const getRubros = () => api.get('/configuracion/rubros');
export const createRubro = (data) => api.post('/configuracion/rubros', data);
export const updateRubro = (id, data) => api.put(`/configuracion/rubros/${id}`, data);
export const deleteRubro = (id) => api.delete(`/configuracion/rubros/${id}`);

// Unidades de medida
export const getUnidades = () => api.get('/configuracion/unidades');
export const createUnidad = (data) => api.post('/configuracion/unidades', data);
export const updateUnidad = (id, data) => api.put(`/configuracion/unidades/${id}`, data);
export const deleteUnidad = (id) => api.delete(`/configuracion/unidades/${id}`);

// Medios de pago
export const getMediosPago = () => api.get('/configuracion/medios-pago');
export const createMedioPago = (data) => api.post('/configuracion/medios-pago', data);
export const updateMedioPago = (id, data) => api.put(`/configuracion/medios-pago/${id}`, data);
export const deleteMedioPago = (id) => api.delete(`/configuracion/medios-pago/${id}`);

// Depósitos
export const getDepositos = () => api.get('/configuracion/depositos');
export const createDeposito = (data) => api.post('/configuracion/depositos', data);
export const updateDeposito = (id, data) => api.put(`/configuracion/depositos/${id}`, data);
export const deleteDeposito = (id) => api.delete(`/configuracion/depositos/${id}`);

// Cajas
export const getCajas = () => api.get('/configuracion/cajas');
export const createCaja = (data) => api.post('/configuracion/cajas', data);
export const updateCaja = (id, data) => api.put(`/configuracion/cajas/${id}`, data);
export const deleteCaja = (id) => api.delete(`/configuracion/cajas/${id}`);
