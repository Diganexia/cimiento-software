const router = require('express').Router();
const auth = require('../middleware/authenticateToken');
const authz = require('../middleware/authorize');
const ctrl = require('../controllers/proveedoresController');

router.get('/',      auth, ctrl.listar);
router.get('/:id',   auth, ctrl.detalle);
router.post('/',     auth, authz('proveedores', 'crear'), ctrl.crear);
router.put('/:id',   auth, authz('proveedores', 'editar'), ctrl.editar);

module.exports = router;
