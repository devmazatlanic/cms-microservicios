const { Router } = require('express');
const { post_recibo_ingreso } = require('../controllers/ingresos');

const router = Router();

router.post('/recibo', post_recibo_ingreso);


module.exports = router;