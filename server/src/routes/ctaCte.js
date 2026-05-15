const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ctaCteController');
const authenticateToken = require('../middleware/authenticateToken');
const authorize = require('../middleware/authorize');

const auth = authenticateToken;
const ver  = authorize('cta_cte', 'ver');
const cobrar = authorize('cta_cte', 'cobrar');
const pagar  = authorize('cta_cte', 'pagar');

// Clientes
router.get('/clientes',                    auth, ver,    ctrl.resumenClientes);
router.get('/clientes/:clienteId',         auth, ver,    ctrl.estadoCuentaCliente);
router.get('/clientes/:clienteId/pdf',     auth, ver,    ctrl.pdfCliente);
router.post('/clientes/cobro',             auth, cobrar, ctrl.cobrar);

// Proveedores
router.get('/proveedores',                 auth, ver,    ctrl.resumenProveedores);
router.get('/proveedores/:proveedorId',    auth, ver,    ctrl.estadoCuentaProveedor);
router.get('/proveedores/:proveedorId/pdf',auth, ver,    ctrl.pdfProveedor);
router.post('/proveedores/pago',           auth, pagar,  ctrl.pagar);

// Cuotas
router.get('/cuotas',                      auth, ver,    ctrl.cuotasPendientes);
router.put('/cuotas/:id/pagar',            auth, cobrar, ctrl.pagarCuota);

module.exports = router;
