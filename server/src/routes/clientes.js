const express = require('express');
const router = express.Router();
const { listar, detalle, crear, editar, eliminar, activar } = require('../controllers/clientesController');
const authenticateToken = require('../middleware/authenticateToken');
const authorize = require('../middleware/authorize');

router.get('/',     authenticateToken, authorize('clientes', 'ver'),    listar);
router.get('/:id',  authenticateToken, authorize('clientes', 'ver'),    detalle);
router.post('/',    authenticateToken, authorize('clientes', 'crear'),  crear);
router.put('/:id',  authenticateToken, authorize('clientes', 'editar'), editar);
router.delete('/:id',       authenticateToken, authorize('clientes', 'editar'), eliminar);
router.patch('/:id/activar', authenticateToken, authorize('clientes', 'editar'), activar);

module.exports = router;
