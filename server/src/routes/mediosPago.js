const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/authenticateToken');

router.get('/', authenticateToken, async (_req, res) => {
  try {
    const data = await db('medios_pago').where('activo', true).orderBy('nombre');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener medios de pago' });
  }
});

module.exports = router;
