const { request, response } = require('express');
// const { enviarCorreo } = require('../config/mail');
const { getDispositivo, store } = require('../models/dispositivos');
const { getPerfil } = require('../models/perfiles');

const post_sensor = async (request, response) => {
    const { mac } = request.body; // Extracción directa de `uuid`
    console.log('body:', request.body);

    if (!mac) {
        return response.status(400).json({
            next: false,
            message: "LA MAC-ADDRESS ES NECESARIA"
        });
    }

    try {
        // OBTENER EL USUARIO DESDE LA BASE DE DATOS
        const _dispositivo = await getDispositivo(mac);

        if (!_dispositivo || _dispositivo.length === 0) {
            // Manejo de caso en que no se obtengan resultados
            return response.status(404).json({
                next: false,
                message: "NO SE ENCONTRO EL DISPOSITIVO."
            });
        }else{
            // VERIFICAMOS QUE EXISTA UNA CONFIGURACION
            let _config = _dispositivo[0].config;

            // INSERTARMOS REGISTROS
            const _store_registro = await store({
                'id_dispositivo_lector': _dispositivo[0].id
            });
            if(_store_registro){
                // RESPUESTA EXITOSA CON LOS PERFILES OBTENIDOS
                return response.status(200).json({
                    message: 'REGISTRO EXITOSO.',
                    next: true,
                    config: JSON.parse(_config)
                });
            }else{
                return response.status(200).json({
                    message: 'HUBO UN ERROR EN EL SERVIDOR.',
                    next: false
                });
            }
        }
    } catch (error) {
        // Manejo de error general
        console.error('ERROR AL OBTENER LOS DISPOSITIVOS:', error);
        return response.status(500).json({
            next: false,
            message: 'Error interno al obtener los dispositivos',
            error: error.message // O puedes remover esto en producción
        });
    }
};


const post_uuid = async (request, response) => {
    const { uuid } = request.body; // Extracción directa de `uuid`
    console.log('body:', request.body);

    if (!uuid) {
        return response.status(400).json({
            next: false,
            message: "LA UUID ES NECESARIA"
        });
    }

    try {
        // OBTENER EL USUARIO DESDE LA BASE DE DATOS
        const _perfil = await getPerfil(uuid);

        if (!_perfil || _perfil.length === 0) {
            // Manejo de caso en que no se obtengan resultados
            return response.status(404).json({
                next: false,
                message: "NO SE ENCONTRO EL DISPOSITIVO."
            });
        }else{
            return response.status(200).json({
                message: 'REGISTRO EXITOSO.',
                data: request.body,
                next: true
            });
        }
    } catch (error) {
        // Manejo de error general
        console.error('ERROR AL OBTENER LOS DISPOSITIVOS:', error);
        return response.status(500).json({
            next: false,
            message: 'Error interno al obtener los dispositivos',
            error: error.message // O puedes remover esto en producción
        });
    }
};

module.exports = {
    post_sensor,
    post_uuid
}