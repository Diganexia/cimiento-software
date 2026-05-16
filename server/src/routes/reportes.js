const router = require('express').Router();
const ctrl = require('../controllers/reportesController');
const authenticateToken = require('../middleware/authenticateToken');

router.use(authenticateToken);

router.get('/kpis',                    ctrl.kpis);
router.get('/ventas-periodo',          ctrl.ventasPorPeriodo);
router.get('/ventas-por-cliente',      ctrl.ventasPorCliente);
router.get('/ranking-productos',       ctrl.rankingProductos);
router.get('/stock-valorizado',        ctrl.stockValorizado);
router.get('/rotacion-stock',          ctrl.rotacionStock);
router.get('/kardex/:productoId',      ctrl.kardex);
router.get('/deudores-clientes',       ctrl.deudoresClientes);
router.get('/comprobantes-afip',       ctrl.comprobantesAfip);

module.exports = router;

