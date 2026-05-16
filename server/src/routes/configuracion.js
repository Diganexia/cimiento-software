const router = require('express').Router();
const ctrl = require('../controllers/configuracionController');
const authenticateToken = require('../middleware/authenticateToken');
const authorize = require('../middleware/authorize');

router.use(authenticateToken);

// Empresa
router.get('/empresa', ctrl.getEmpresa);
router.put('/empresa', authorize('configuracion', 'editar'), ctrl.updateEmpresa);

// Puntos de venta AFIP
router.get('/puntos-venta', ctrl.listPuntosVenta);
router.post('/puntos-venta', authorize('configuracion', 'editar'), ctrl.createPuntoVenta);
router.put('/puntos-venta/:id', authorize('configuracion', 'editar'), ctrl.updatePuntoVenta);
router.delete('/puntos-venta/:id', authorize('configuracion', 'editar'), ctrl.deletePuntoVenta);

// Rubros
router.get('/rubros', ctrl.listRubros);
router.post('/rubros', authorize('configuracion', 'editar'), ctrl.createRubro);
router.put('/rubros/:id', authorize('configuracion', 'editar'), ctrl.updateRubro);
router.delete('/rubros/:id', authorize('configuracion', 'editar'), ctrl.deleteRubro);

// Unidades de medida
router.get('/unidades', ctrl.listUnidades);
router.post('/unidades', authorize('configuracion', 'editar'), ctrl.createUnidad);
router.put('/unidades/:id', authorize('configuracion', 'editar'), ctrl.updateUnidad);
router.delete('/unidades/:id', authorize('configuracion', 'editar'), ctrl.deleteUnidad);

// Medios de pago
router.get('/medios-pago', ctrl.listMediosPago);
router.post('/medios-pago', authorize('configuracion', 'editar'), ctrl.createMedioPago);
router.put('/medios-pago/:id', authorize('configuracion', 'editar'), ctrl.updateMedioPago);
router.delete('/medios-pago/:id', authorize('configuracion', 'editar'), ctrl.deleteMedioPago);

// DepÃ³sitos
router.get('/depositos', ctrl.listDepositos);
router.post('/depositos', authorize('configuracion', 'editar'), ctrl.createDeposito);
router.put('/depositos/:id', authorize('configuracion', 'editar'), ctrl.updateDeposito);
router.delete('/depositos/:id', authorize('configuracion', 'editar'), ctrl.deleteDeposito);

// Cajas
router.get('/cajas', ctrl.listCajas);
router.post('/cajas', authorize('configuracion', 'editar'), ctrl.createCaja);
router.put('/cajas/:id', authorize('configuracion', 'editar'), ctrl.updateCaja);
router.delete('/cajas/:id', authorize('configuracion', 'editar'), ctrl.deleteCaja);

module.exports = router;

