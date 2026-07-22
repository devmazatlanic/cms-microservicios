const { Router } = require('express');
const { requireInternalApiKey } = require('../helpers/internal_api_key');
const { 
        get_pantalla_by_id,
        get_pantalla_by_token, 
        store_pantalla,
        get_socket_airplay_status,
        refresh_socket_airplay_playlist,
    } = require('../controllers/pantallas');

const router = Router();

router.get('/id', get_pantalla_by_id);
router.get('/mac', get_pantalla_by_token);
router.get('/socket/status', requireInternalApiKey, get_socket_airplay_status);
router.post('/socket/refresh', requireInternalApiKey, refresh_socket_airplay_playlist);
router.post('/store', store_pantalla);

module.exports = router;
