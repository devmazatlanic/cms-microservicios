const { request, response } = require('express');
// const { enviarCorreo } = require('../config/mail');
const { getUsuario } = require('../models/perfiles');

const post_rfid = async (request, response) => {
    const body = request.body;
    console.log('body: ', body);
    try {
        // OBTENEMOS EL USUARIO DESDE LA BASE DE DATOS
        const perfiles = await getUsuario(body.uuid);

        // EXTRAEMOS LOS DATOS RELEVANTES DE LA RESPUESTA DE LA BASE DE DATOS
        /*const perfilesData = perfiles.map(perfil => ({
            id: perfil.id_perfil,
            nombre: perfil.nombre,
        }));*/

        // ENVIAMOS LA RESPUESTA JSON CON LOS DATOS EXTRAIDOS
        response.json({
            message: 'GET API - CONTROLLER',
            perfiles: perfiles
        });

        // ENVIAMOS EL CORREO ELECTRONICO CON LOS DATOS OBTENIDOS
        // await enviarCorreo();
    } catch (error) {
        console.error('ERROR AL OBTENER LOS PERFILES: ', error);
        response.status(500).json({ error: 'ERROR AL OBTENER LOS PERFILES' });
    }
}


module.exports = {
    post_rfid
}