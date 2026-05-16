const router = require('express').Router();
const auth = require('../middleware/authenticateToken');
const authz = require('../middleware/authorize');
const ctrl = require('../controllers/productosController');

router.get('/',       auth, authz('productos', 'ver'),      ctrl.listar);
router.get('/:id',    auth, authz('productos', 'ver'),      ctrl.detalle);
router.post('/',      auth, authz('productos', 'crear'),    ctrl.crear);
router.put('/:id',    auth, authz('productos', 'editar'),   ctrl.editar);
router.delete('/:id', auth, authz('productos', 'eliminar'), ctrl.eliminar);

module.exports = router;
