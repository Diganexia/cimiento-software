const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cajaController');
const authenticateToken = require('../middleware/authenticateToken');
const authorize = require('../middleware/authorize');

const auth = authenticateToken;
const ver    = authorize('caja', 'ver_movimientos');
const abrir  = authorize('caja', 'abrir');
const cerrar = authorize('caja', 'cerrar');

router.get ('/',                       auth, ver,    ctrl.listaCajas);
router.post('/',                       auth, abrir,  ctrl.crearCaja);
router.post('/abrir',                  auth, abrir,  ctrl.abrir);
router.post('/cerrar',                 auth, cerrar, ctrl.cerrar);
router.get ('/arqueo-actual',          auth, ver,    ctrl.arqueoActual);
router.get ('/arqueos',                auth, ver,    ctrl.historial);
router.get ('/arqueos/:id',            auth, ver,    ctrl.detalleArqueo);
router.get ('/arqueos/:id/pdf',        auth, ver,    ctrl.pdf);
router.get ('/arqueo-actual/pdf',      auth, ver,    (req, res) => { req.params.id = 'actual'; ctrl.pdf(req, res); });
router.post('/movimiento-manual',      auth, ver,    ctrl.movimientoManual);

module.exports = router;
