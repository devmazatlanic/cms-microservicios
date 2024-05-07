const { Router } = require('express');
const { post_notificacion_solicitudautorizacion, post_notificaciones_solicitudcancelacion } = require('../controllers/notificaciones');

const router = Router();

router.post('/solicitudcancelacion', post_notificaciones_solicitudcancelacion);
router.post('/solicitudautorizacion', post_notificacion_solicitudautorizacion);

module.exports = router;