const { request, response } = require('express');
const { evenots_web_hoy } = require('../models/eventos');
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
            image: `data:image/png;base64,${_element.image}`
        }));


        return response.status(200).json({
            data: _eventos,
            next: true
        });
    }
};


module.exports = {
    event_list_hoy,
    event_list_proximos
}