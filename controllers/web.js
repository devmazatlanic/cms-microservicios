const { request, response } = require('express');
const { evenots_web } = require('../models/eventos');
// const { enviarCorreo } = require('../config/mail');


const event_list = async (request, response) => {
    // MOSTRAREMOS LISTA DE EVENTOS ACTIVOS
    const eventos = await evenots_web();

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
    event_list
}