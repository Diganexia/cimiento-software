const express = require('express');
const router = express.Router();
const { listar, detalle, crear, confirmarVenta, anular, pdf } = require('../controllers/ventasController');
const authenticateToken = require('../middleware/authenticateToken');
const authorize = require('../middleware/authorize');

router.get('/',              authenticateToken, authorize('ventas', 'ver'),    listar);
router.get('/:id',           authenticateToken, authorize('ventas', 'ver'),    detalle);
router.get('/:id/pdf',       authenticateToken, authorize('ventas', 'ver'),    pdf);
router.post('/',             authenticateToken, authorize('ventas', 'crear'),  crear);
router.post('/:id/confirmar',authenticateToken, authorize('ventas', 'crear'),  confirmarVenta);
router.post('/:id/anular',   authenticateToken, authorize('ventas', 'anular'), anular);

module.exports = router;
