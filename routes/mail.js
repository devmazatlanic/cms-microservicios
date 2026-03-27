const { Router } = require('express');
const { post_simple_notification } = require('../controllers/mail');

const router = Router();

router.post('/simple', post_simple_notification);

module.exports = router;
