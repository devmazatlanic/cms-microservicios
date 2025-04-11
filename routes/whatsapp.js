const { Router } = require('express');
const { verify_token, received_message } = require('../controllers/whatsapp');

const router = Router();

router.get('/', verify_token);
router.post('/', received_message);

module.exports = router;