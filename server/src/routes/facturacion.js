const router = require('express').Router();
const authenticateToken = require('../middleware/authenticateToken');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/facturasController');

router.get('/ventas-disponibles', authenticateToken, authorize('facturacion', 'ver'), ctrl.ventasDisponibles);
router.get('/',                   authenticateToken, authorize('facturacion', 'ver'), ctrl.listar);
router.get('/:id/pdf',            authenticateToken, authorize('facturacion', 'ver'), ctrl.pdf);
router.get('/:id',                authenticateToken, authorize('facturacion', 'ver'), ctrl.detalle);
router.post('/',                  authenticateToken, authorize('facturacion', 'crear'), ctrl.crear);
router.post('/:id/emitir',        authenticateToken, authorize('facturacion', 'emitir'), ctrl.emitir);

module.exports = router;
