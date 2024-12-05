const { request, response } = require('express');
const { evenots_web_hoy, evenots_web_proximos } = require('../models/eventos');
const { addMapeoQr } = require('../models/codigoqrs');
// const { enviarCorreo } = require('../config/mail');


const event_list_hoy = async (request, response) => {
    // MOSTRAREMOS LISTA DE EVENTOS ACTIVOS
    const eventos = await evenots_web_hoy();

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

const event_list_proximos = async (request, response) => {
    // MOSTRAREMOS LISTA DE EVENTOS ACTIVOS
    const eventos = await evenots_web_proximos();

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
    // console.log('body: ', body);

    try {
        const result = await addMapeoQr(body);
        return response.status(500).json({
            next: true
        });
    } catch (error) {
        console.error('Error al insertar: ', error.message);
        return response.status(200).json({
            next: false
        });
    }
}


module.exports = {
    event_list_hoy,
    event_list_proximos,
    tracking_codeqr
}