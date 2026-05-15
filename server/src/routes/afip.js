const express = require('express');
const router = express.Router();
const { puntosVenta, comprobantes } = require('../controllers/afipController');
const authenticateToken = require('../middleware/authenticateToken');
const authorize = require('../middleware/authorize');

router.get('/puntos-venta',  authenticateToken, authorize('ventas', 'ver'), puntosVenta);
router.get('/comprobantes',  authenticateToken, authorize('ventas', 'ver'), comprobantes);

module.exports = router;
