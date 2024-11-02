const { Router } = require('express');
const { post_sensor, post_uuid } = require('../controllers/rfid');

const router = Router();

router.post('/sensor', post_sensor);
router.post('/uuid', post_uuid);

module.exports = router;