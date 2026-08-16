const { request, response } = require('express');
const { web_today, web_upcoming, web_contactus } = require('../models/eventos');
const { addMapeoQr } = require('../models/codigoqrs');
const { mail_web_contactus, mail_web_reminder_contactus } = require('../config/mail');
const { sendCrmLeadNotification } = require('../helpers/crm_leads');


const today = async (request, response) => {
    try {
        // MOSTRAREMOS LISTA DE EVENTOS ACTIVOS
        const eventos = await web_today();

        if (!eventos || eventos.length === 0) {
            // Manejo de caso en que no se obtengan resultados
            return response.status(200).json({
                next: false,
                message: "NO SE ENCONTRARON EVENTOS."
            });
        } else {
            // EXTRAEMOS LOS DATOS RELEVANTES DE LA RESPUESTA DE LA BASE DE DATOS
            const _eventos = eventos.map(_element => ({
                evento: _element.evento,
                fecha: _element.fecha,
                image: `data:image/png;base64,${_element.image}`,
                salones: _element.salones
            }));


            return response.status(200).json({
                data: _eventos,
                next: true
            });
        }
    } catch (error) {
        console.error('Error al obtener eventos del dia:', error.message);
        return response.status(500).json({
            next: false,
            message: 'NO FUE POSIBLE OBTENER LOS EVENTOS.'
        });
    }
};

const upcoming = async (request, response) => {
    try {
        // MOSTRAREMOS LISTA DE EVENTOS ACTIVOS
        const eventos = await web_upcoming();

        if (!eventos || eventos.length === 0) {
            // Manejo de caso en que no se obtengan resultados
            return response.status(200).json({
                next: false,
                message: "NO SE ENCONTRARON EVENTOS."
            });
        } else {
            // EXTRAEMOS LOS DATOS RELEVANTES DE LA RESPUESTA DE LA BASE DE DATOS
            const _eventos = eventos.map(_element => ({
                evento: _element.evento,
                fecha: _element.fecha,
                image: `data:image/png;base64,${_element.image}`,
                salones: _element.salones
            }));


            return response.status(200).json({
                data: _eventos,
                next: true
            });
        }
    } catch (error) {
        console.error('Error al obtener eventos proximos:', error.message);
        return response.status(500).json({
            next: false,
            message: 'NO FUE POSIBLE OBTENER LOS EVENTOS.'
        });
    }
};

const tracking_codeqr = async (request, response) => {
    const body = request.body;

    try {
        const result = await addMapeoQr(body);
        return response.status(200).json({
            next: true
        });
    } catch (error) {
        console.error('Error al insertar: ', error.message);
        return response.status(500).json({
            next: false
        });
    }
}

const contactus = async (request, response) => {
    const body = request.body;

    try {
        // OBTENEMOS EL RESULTADO DE LA BASE DE DATOS
        const result = await web_contactus(body);
        let mailError = null;

        // ENVIAMOS EL CORREO SIN REVERTIR EL SEGUIMIENTO SI EL SMTP FALLA
        try {
            if (result.is_new_thread) {
                await mail_web_contactus(body);
            } else {
                await mail_web_reminder_contactus(body);
            }
        } catch (error) {
            mailError = error.message;
            console.error('[MAIL][CRM] ERROR AL NOTIFICAR CONTACTO:', {
                seguimiento_id: result.id,
                message: mailError
            });
        }

        // NOTIFICAMOS AL DIRECTOR COMERCIAL SIN BLOQUEAR EL REGISTRO DEL LEAD
        const whatsappNotification = await sendCrmLeadNotification({
            director: result.director,
            payload: result.payload,
            seguimientoId: result.id,
            isNewThread: result.is_new_thread
        });

        // RESPONDEMOS AL FRONT
        return response.status(200).json({
            next: result.next,
            message: result.message,
            seguimiento_id: result.id,
            reference_id: result.reference_id,
            new_thread: result.is_new_thread,
            mail_error: mailError ? 'NO FUE POSIBLE ENVIAR EL CORREO DE NOTIFICACION.' : null,
            whatsapp_notification: whatsappNotification
        });

    } catch (error) {
        return response.status(error.statusCode || 500).json({
            next: false,
            message: error.message
        });
    }
}


module.exports = {
    today,
    upcoming,
    tracking_codeqr,
    contactus
}
