const { request, response } = require('express');
// const { enviarCorreo } = require('../config/mail');
const { getUsuario } = require('../models/perfiles');

const post_rfid = async (request, response) => {
    const { uuid } = request.body; // Extracción directa de `uuid`
    console.log('body:', request.body);

    // Validar si el campo `uuid` existe
    if (!uuid) {
        return response.status(400).json({
            next: false,
            message: "El UUID es necesario"
        });
    }

    try {
        // OBTENER EL USUARIO DESDE LA BASE DE DATOS
        const perfiles = await getUsuario(uuid);

        if (!perfiles || perfiles.length === 0) {
            // Manejo de caso en que no se obtengan resultados
            return response.status(404).json({
                next: false,
                message: "No se encontraron perfiles para el UUID proporcionado"
            });
        }

        // RESPUESTA EXITOSA CON LOS PERFILES OBTENIDOS
        return response.status(200).json({
            message: 'Perfiles obtenidos correctamente',
            perfiles: perfiles,
            next: true
        });

        // Podrías enviar el correo después de la respuesta si es necesario
        // await enviarCorreo();
    } catch (error) {
        // Manejo de error general
        console.error('ERROR AL OBTENER LOS PERFILES:', error);
        return response.status(500).json({
            next: false,
            message: 'Error interno al obtener los perfiles',
            error: error.message // O puedes remover esto en producción
        });
    }
};



module.exports = {
    post_rfid
}