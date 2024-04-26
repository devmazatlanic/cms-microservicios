const { Router } = require('express');
const { get_perfiles, post_perfiles } = require('../controllers/perfiles');

const router = Router();

router.get('/', get_perfiles);
router.post('/', post_perfiles);

module.exports = router;