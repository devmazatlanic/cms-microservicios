const { Router } = require('express');
const { post_notificacion_solicitudautorizacion, post_notificaciones_solicitudcancelacion, post_notificaciones } = require('../controllers/notificaciones');

const router = Router();

router.post('/', post_notificaciones);
router.post('/solicitudcancelacion', post_notificaciones_solicitudcancelacion);
router.post('/solicitudautorizacion', post_notificacion_solicitudautorizacion);


module.exports = router;