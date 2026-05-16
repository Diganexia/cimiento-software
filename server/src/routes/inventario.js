const router = require('express').Router();
const auth = require('../middleware/authenticateToken');
const authz = require('../middleware/authorize');
const ctrl = require('../controllers/inventarioController');

router.post('/',              auth, authz('stock', 'inventario'), ctrl.abrir);
router.get('/:id',            auth, authz('stock', 'inventario'), ctrl.obtener);
router.put('/:id/items',      auth, authz('stock', 'inventario'), ctrl.actualizarItems);
router.post('/:id/confirmar', auth, authz('stock', 'inventario'), ctrl.confirmar);
router.delete('/:id',         auth, authz('stock', 'inventario'), ctrl.cancelar);

module.exports = router;
