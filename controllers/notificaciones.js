const { request, response } = require('express');
const { enviarCorreo, mail_solicitudAutorizacion, mail_cancelacionCotizacion } = require('../config/mail');
const { getUsuario } = require('../models/perfiles');
const { getSolicitudAutorizacion, setSolicitudAutorizacionByNotificacion } = require('../models/autorizaciones');
const { procesure_getDatosGeneralesEventosById } = require('../models/eventos');


const post_notificaciones_solicitudcancelacion = async (request, response) => {
    const body = request.body;

    try {
        // MANDAMOS LOS DATOS DE SOLICITUD DE AUTORIZACION Y NOTIFICACION DESDE LA BASE DE DATOS
        const set_solicitudautorizacion = await setSolicitudAutorizacionByNotificacion(body);
        // OBTENEMOS LOS DATOS DE SOLICITUD DE AUTORIZACION DESDE LA BASE DE DATOS
        const get_solicitudautorizacion = await getSolicitudAutorizacion(set_solicitudautorizacion.tcr_autorizacionsolicitud);
        // OBTENEMOS LOS DATOS DEL EVENTO DESDE LA BASE DE DATOS
        const call_datosgeneralevento = await procesure_getDatosGeneralesEventosById(body.evento_id);
        // VALIDAR QUE LA RESPUESTA DE LA BASE DE DATOS SEA UN ARRAY Y TENGA AL MENOS UN ELEMENTO
        if (!Array.isArray(call_datosgeneralevento) || call_datosgeneralevento.length === 0 || !Array.isArray(call_datosgeneralevento[0]) || call_datosgeneralevento[0].length === 0) {
            throw new Error('NO SE ENCONTRARON DATOS EN LA BASE DE DATOS.');
        }

        // ENVIAMOS LA RESPUESTA JSON CON LOS DATOS EXTRAIDOS
        response.json({
            message: 'SE ENVIO LA SOLICITUD CON EXITO.'
        });

        // EXTRAEMOS LOS DATOS RELEVANTES DE LA RESPUESTA DE LA BASE DE DATOS
        let data = get_solicitudautorizacion.map(solicitud => ({
            quiensolicita: solicitud.quiensolicita,
            comentarios: solicitud.comentarios,
            email_quiensolicita: solicitud.email_quiensolicita,
            quienautoriza: solicitud.quienautoriza,
            email_quienautoriza: solicitud.email_quienautoriza,
            // ASIGNAMOS LOS DATOS DEL PROCEDIMIENTO ALMACENADO A DATA PARA ENVIAR TODO A LA VISTA Y PREPARAR EL CORREO A ENVIAR
            cotizacion_id: body.cotizacion_id,
            comentario_id: body.tabla_id,
            evento: call_datosgeneralevento[0][0]
        }));


        // ENVIAMOS EL CORREO ELECTRONICO CON LOS DATOS OBTENIDOS
        for (const element of data) {
            await mail_cancelacionCotizacion(element);
        }

    } catch (error) {
        console.error('ERROR AL OBTENER LA SOLICITUD, VUELVA A INTENTARLO O HABLE CON EL DPTO. DE TI: ', error);
        response.status(500).json({ message: 'ERROR AL OBTENER LA SOLICITUD, VUELVA A INTENTARLO O HABLE CON EL DPTO. DE TI.' });
    }
};

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
    post_notificaciones_solicitudcancelacion,
    post_notificacion_solicitudautorizacion
}