const { Router } = require('express');
const { 
        get_pantalla_by_id,
        get_pantalla_by_token, 
        store_pantalla,
    } = require('../controllers/pantallas');

const router = Router();

router.get('/id', get_pantalla_by_id);
router.get('/mac', get_pantalla_by_token);
router.post('/store', store_pantalla);

module.exports = router;