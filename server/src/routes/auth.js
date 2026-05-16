const express = require('express');
const router = express.Router();
const { login, logout, me } = require('../controllers/authController');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, me);

module.exports = router;
