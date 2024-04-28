const { request, response } = require('express');
const { enviarCorreo, mail_solicitudAutorizacion } = require('../config/mail');
const { getUsuario } = require('../models/perfiles');
const { getSolicitudAutorizacion } = require('../models/autorizaciones');




const post_notificacion_solicitudautorizacion = async (request, response) => {
    const body = request.body;
    console.log('body: ', request.body);


    try {
        // OBTENEMOS LOS DATOS DE SOLICITUD DE AUTORIZACION DESDE LA BASE DE DATOS
        const solicitudautorizacion = await getSolicitudAutorizacion(body.id_solicitudautorizacion);
        // VALIDAR QUE LA RESPUESTA DE LA BASE DE DATOS SEA UN ARRAY Y TENGA AL MENOS UN ELEMENTO
        if (!Array.isArray(solicitudautorizacion) || solicitudautorizacion.length === 0) {
            throw new Error('NO SE ENCONTRARON DATOS EN LA BASE DE DATOS.');
        }

        // EXTRAEMOS LOS DATOS RELEVANTES DE LA RESPUESTA DE LA BASE DE DATOS
        const data = solicitudautorizacion.map(solicitud => ({
            quiensolicita: solicitud.quiensolicita,
            comentarios: solicitud.comentarios,
            email_quiensolicita: solicitud.email_quiensolicita,
            quienautoriza: solicitud.quienautoriza,
            email_quienautoriza: solicitud.email_quienautoriza
        }));

        // ENVIAMOS LA RESPUESTA JSON CON LOS DATOS EXTRAIDOS
        response.json({
            message: 'SE ENVIO LA SOLICITUD CON EXITO.'
        });

        // ENVIAMOS EL CORREO ELECTRONICO CON LOS DATOS OBTENIDOS
        for (const element of data) {
            await mail_solicitudAutorizacion(element);
        }

    } catch (error) {
        console.error('ERROR AL OBTENER LA SOLICITUD, VUELVA A INTENTARLO O HABLE CON EL DPTO. DE TI: ', error);
        response.status(500).json({ message: 'ERROR AL OBTENER LA SOLICITUD, VUELVA A INTENTARLO O HABLE CON EL DPTO. DE TI.' });
    }
};

module.exports = {
    post_notificacion_solicitudautorizacion
}