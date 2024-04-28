const { request, response } = require('express');
const { enviarCorreo } = require('../config/mail');
const { getPerfiles } = require('../models/perfiles');


const get_perfiles = async (request, response) => {
    try {
        // OBTENEMOS EL USUARIO DESDE LA BASE DE DATOS
        const perfiles = await getPerfiles();

        // EXTRAEMOS LOS DATOS RELEVANTES DE LA RESPUESTA DE LA BASE DE DATOS
        const perfilesData = perfiles.map(perfil => ({
            id: perfil.id_perfil,
            nombre: perfil.nombre,
        }));

        // ENVIAMOS LA RESPUESTA JSON CON LOS DATOS EXTRAIDOS
        response.json({
            message: 'GET API - CONTROLLER',
            perfiles: perfilesData
        });

        // ENVIAMOS EL CORREO ELECTRONICO CON LOS DATOS OBTENIDOS
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