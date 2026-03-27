const { mail_simple_notification } = require('../config/mail');

const normalizeString = (value) => String(value ?? '').trim();

const post_simple_notification = async (request, response) => {
    const to = normalizeString(request.body?.to);
    const name = normalizeString(request.body?.name);
    const comment = normalizeString(request.body?.comment);
    const subject = normalizeString(request.body?.subject) || 'NOTIFICACION - MAZATLAN INTERNATIONAL CENTER';
    const cc = normalizeString(request.body?.cc);

    if (!to || !name || !comment) {
        return response.status(400).json({
            next: false,
            message: 'NECESITA `to`, `name` Y `comment` PARA ENVIAR EL CORREO.'
        });
    }

    try {
        await mail_simple_notification({
            to,
            name,
            comment,
            subject,
            cc
        });

        return response.status(200).json({
            next: true,
            message: 'SE ENVIO EL CORREO CON EXITO.'
        });
    } catch (error) {
        return response.status(500).json({
            next: false,
            message: error.message
        });
    }
};

module.exports = {
    post_simple_notification
};
