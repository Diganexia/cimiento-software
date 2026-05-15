const router = require('express').Router();
const auth = require('../middleware/authenticateToken');
const { listarUnidadesMedida } = require('../controllers/rubrosController');

router.get('/', auth, listarUnidadesMedida);

module.exports = router;
