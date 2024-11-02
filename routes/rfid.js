const { Router } = require('express');
const { post_rfid } = require('../controllers/rfid');

const router = Router();

router.post('/', post_rfid);

module.exports = router;