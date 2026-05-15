const router = require('express').Router();
const auth = require('../middleware/authenticateToken');
const { listarRubros } = require('../controllers/rubrosController');

router.get('/', auth, listarRubros);

module.exports = router;
