const router = require('express').Router();
const auth = require('../middleware/authenticateToken');
const authz = require('../middleware/authorize');
const ctrl = require('../controllers/depositosController');

router.get('/',      auth, ctrl.listar);
router.post('/',     auth, authz('configuracion', 'editar'), ctrl.crear);
router.put('/:id',   auth, authz('configuracion', 'editar'), ctrl.editar);

module.exports = router;
