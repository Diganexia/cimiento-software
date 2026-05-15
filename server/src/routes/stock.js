const router = require('express').Router();
const auth = require('../middleware/authenticateToken');
const authz = require('../middleware/authorize');
const ctrl = require('../controllers/stockController');

router.get('/',               auth, authz('stock', 'ver'),        ctrl.listar);
router.get('/movimientos',    auth, authz('stock', 'ver'),        ctrl.movimientos);
router.post('/transferencia', auth, authz('stock', 'transferir'), ctrl.transferencia);
router.post('/ajuste',        auth, authz('stock', 'ajustar'),    ctrl.ajuste);

module.exports = router;
