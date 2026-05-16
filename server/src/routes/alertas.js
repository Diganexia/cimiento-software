const router = require('express').Router();
const auth = require('../middleware/authenticateToken');
const ctrl = require('../controllers/alertasController');

router.get('/stock', auth, ctrl.stockBajoMinimo);

module.exports = router;
