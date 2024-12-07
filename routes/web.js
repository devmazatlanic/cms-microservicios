const { Router } = require('express');
const { event_list_hoy, event_list_proximos, tracking_codeqr } = require('../controllers/web');

const router = Router();

router.get('/events/today', event_list_hoy);
router.get('/events/upcoming', event_list_proximos);
router.post('/trackingcodeqr', tracking_codeqr);


module.exports = router;