const { request, response } = require('express');
const { mail_enviar_recibodeingreso } = require('../config/mail');
const { getSolicitudAutorizacion, setSolicitudAutorizacionByNotificacion } = require('../models/autorizaciones');
const { procesure_getDatosGeneralesEventosById } = require('../models/eventos');


const post_recibo_ingreso = async (request, response) => {
    const body = request.body;

    try {
        // ENVIAMOS LA RESPUESTA JSON CON LOS DATOS EXTRAIDOS
        response.json({
            message: 'SE ENVIO EL RECIBO CON EXITO.',
            response: body
        });

        // ENVIAMOS EL CORREO ELECTRONICO CON LOS DATOS OBTENIDOS
        await mail_enviar_recibodeingreso(body);

    } catch (error) {
        console.error('ERROR AL OBTENER EL RECIBO, VUELVA A INTENTARLO O HABLE CON EL DPTO. DE TI: ', error);
        response.status(500).json({ message: 'ERROR AL OBTENER EL RECIBO, VUELVA A INTENTARLO O HABLE CON EL DPTO. DE TI.' });
    }
};

module.exports = {
    post_recibo_ingreso
}