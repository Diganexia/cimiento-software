const router = require('express').Router();
const ctrl = require('../controllers/usuariosController');
const authenticateToken = require('../middleware/authenticateToken');
const authorize = require('../middleware/authorize');

router.use(authenticateToken);

router.get('/roles', ctrl.listarRoles);
router.get('/', authorize('usuarios', 'ver'), ctrl.listar);
router.get('/:id', authorize('usuarios', 'ver'), ctrl.detalle);
router.post('/', authorize('usuarios', 'crear'), ctrl.crear);
router.put('/:id', authorize('usuarios', 'editar'), ctrl.editar);
router.put('/:id/password', ctrl.cambiarPassword);

module.exports = router;

