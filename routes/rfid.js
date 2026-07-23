const { Router } = require('express');
const { post_sensor, get_sensor_config, post_uuid } = require('../controllers/rfid');

const router = Router();

router.post('/sensor', post_sensor);
router.get('/sensor', get_sensor_config);
router.post('/uuid', post_uuid);

module.exports = router;
