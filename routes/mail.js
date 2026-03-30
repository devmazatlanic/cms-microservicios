const { Router } = require('express');
const { post_simple_notification } = require('../controllers/mail');
const { requireInternalApiKey } = require('../helpers/internal_api_key');

const router = Router();

router.post('/simple', requireInternalApiKey, post_simple_notification);

module.exports = router;
