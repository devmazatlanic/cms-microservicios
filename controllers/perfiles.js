const { request, response } = require('express');
const { enviarCorreo } = require('../config/mail');
const { getPerfiles } = require('../models/perfiles');


const get_perfiles = async (request, response) => {
    try {
        const perfiles = await getPerfiles(); // Obtenemos los perfiles desde la base de datos

        // Extraemos los datos relevantes de la respuesta de la base de datos
        const perfilesData = perfiles.map(perfil => ({
            id: perfil.id,
            nombre: perfil.nombre,
            // Agrega otras propiedades relevantes según la estructura de tus perfiles
        }));

        // Enviamos la respuesta JSON con los datos extraídos
        response.json({
            message: 'GET API - CONTROLLER',
            perfiles: perfilesData
        });

        // Enviamos el correo electrónico con los datos obtenidos
        await enviarCorreo();
    } catch (error) {
        console.error('ERROR AL OBTENER LOS PERFILES: ', error);
        response.status(500).json({ error: 'ERROR AL OBTENER LOS PERFILES' });
    }
};

const post_perfiles = (request, response) => {
    const body = request.body;

    response.json({
        message: 'POST API - CONTROLLER',
        body
    });
}


module.exports = {
    get_perfiles,
    post_perfiles
}