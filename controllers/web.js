const { request, response } = require('express');
const { web_today, web_upcoming, web_contactus } = require('../models/eventos');
const { addMapeoQr } = require('../models/codigoqrs');
const { mail_web_contactus, mail_web_reminder_contactus } = require('../config/mail');


const today = async (request, response) => {
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
};

const upcoming = async (request, response) => {
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
        // ENVIAMOS EL CORREO
        if (result.next) {
            await mail_web_contactus(body);
        } else {
            await mail_web_reminder_contactus(body);
        }
        // RESPONDEMOS AL FRONT
        return response.status(200).json({
            next: result.next,
            message: result.message
        });

    } catch (error) {
        return response.status(500).json({
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