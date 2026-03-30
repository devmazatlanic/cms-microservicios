const { Router } = require('express');

const router = Router();

const notificaciones_deshabilitadas = (_request, response) => {
    return response.status(410).json({
        next: false,
        message: 'El servicio de notificaciones por correo se encuentra deshabilitado temporalmente.'
    });
};

router.post('/', notificaciones_deshabilitadas);
router.post('/solicitudcancelacion', notificaciones_deshabilitadas);
router.post('/solicitudautorizacion', notificaciones_deshabilitadas);
router.get('/enviar_reporte_bancos', notificaciones_deshabilitadas);


module.exports = router;
