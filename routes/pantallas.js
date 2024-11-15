const { Router } = require('express');
const { 
        get_pantalla_by_id,
        get_pantalla_by_mac, 
        get_mac_address,
        store_pantalla,
    } = require('../controllers/pantallas');

const router = Router();

router.get('/id', get_pantalla_by_id);
router.get('/mac', get_pantalla_by_mac);
router.post('/store', store_pantalla);

module.exports = router;