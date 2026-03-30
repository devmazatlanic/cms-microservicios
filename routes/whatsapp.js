const { Router } = require('express');
const { verify_token, received_message, send_notification } = require('../controllers/whatsapp');
const { requireInternalApiKey } = require('../helpers/internal_api_key');

const router = Router();

router.get('/', verify_token);
router.post('/', received_message);
router.post('/send_notification', requireInternalApiKey, send_notification);

module.exports = router;
