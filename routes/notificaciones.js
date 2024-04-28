const { Router } = require('express');
const { post_notificacion_solicitudautorizacion } = require('../controllers/notificaciones');

const router = Router();

router.post('/solicitudautorizacion', post_notificacion_solicitudautorizacion);

module.exports = router;