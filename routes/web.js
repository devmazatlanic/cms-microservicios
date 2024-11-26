const { Router } = require('express');
const { event_list } = require('../controllers/web');

const router = Router();

router.get('/events', event_list);


module.exports = router;