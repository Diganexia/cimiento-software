const router = require('express').Router();
const auth = require('../middleware/authenticateToken');
const authz = require('../middleware/authorize');
const ctrl = require('../controllers/comprasController');

router.get('/',                  auth, authz('compras', 'ver'),      ctrl.listar);
router.get('/:id/pdf',           auth, authz('compras', 'ver'),      ctrl.pdfCompra);
router.get('/:id',               auth, authz('compras', 'ver'),      ctrl.detalle);
router.post('/',                 auth, authz('compras', 'crear'),    ctrl.crear);
router.put('/:id',               auth, authz('compras', 'crear'),    ctrl.editar);
router.put('/:id/confirmar',     auth, authz('compras', 'confirmar'),ctrl.confirmarCompra);

module.exports = router;
