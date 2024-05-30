const { Router } = require('express');
const {
    post_notificacion_solicitudautorizacion,
    post_notificaciones_solicitudcancelacion,
    post_notificaciones,
    post_notificaciones_reporte_bancos
} = require('../controllers/notificaciones');

const router = Router();

router.post('/', post_notificaciones);
router.post('/solicitudcancelacion', post_notificaciones_solicitudcancelacion);
router.post('/solicitudautorizacion', post_notificacion_solicitudautorizacion);
router.get('/enviar_reporte_bancos', post_notificaciones_reporte_bancos);


module.exports = router;