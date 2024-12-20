const { Router } = require('express');
const { today, upcoming, tracking_codeqr, contactus } = require('../controllers/web');

const router = Router();

router.get('/events/today', today);
router.get('/events/upcoming', upcoming);
router.post('/trackingcodeqr', tracking_codeqr);
router.post('/events/contactus', contactus);

module.exports = router;