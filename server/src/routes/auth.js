const express = require('express');
const router = express.Router();
const { login, logout, me, heartbeat } = require('../controllers/authController');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.post('/heartbeat', authenticateToken, heartbeat);
router.get('/me', authenticateToken, me);

module.exports = router;
