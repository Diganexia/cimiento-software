const router = require('express').Router();
const auth = require('../middleware/auth');
const authz = require('../middleware/authorize');
const ctrl = require('../controllers/facturasController');

router.get('/ventas-disponibles', auth, authz('facturacion', 'ver'), ctrl.ventasDisponibles);
router.get('/',                   auth, authz('facturacion', 'ver'), ctrl.listar);
router.get('/:id/pdf',            auth, authz('facturacion', 'ver'), ctrl.pdf);
router.get('/:id',                auth, authz('facturacion', 'ver'), ctrl.detalle);
router.post('/',                  auth, authz('facturacion', 'crear'), ctrl.crear);
router.post('/:id/emitir',        auth, authz('facturacion', 'emitir'), ctrl.emitir);

module.exports = router;
