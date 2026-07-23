const { request, response } = require('express');
// const { enviarCorreo } = require('../config/mail');
const { getDispositivo, store } = require('../models/dispositivos');
const { getPerfil } = require('../models/perfiles');
const { getTarjeta } = require('../models/tarjetas');

const parseDeviceConfig = (value) => {
    if (value && typeof value === 'object') {
        return value;
    }

    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }

    try {
        const parsedConfig = JSON.parse(value);
        return parsedConfig && typeof parsedConfig === 'object' ? parsedConfig : null;
    } catch (error) {
        return null;
    }
};

const get_sensor_config = async (request, response) => {
    const mac = String(request.query.mac || '').trim();
    console.log('[HWARE][SENSOR] CONSULTA DE CONFIGURACION:', { mac: mac || null });

    if (!mac) {
        return response.status(400).json({
            next: false,
            message: 'LA MAC-ADDRESS ES NECESARIA EN EL PARAMETRO mac.'
        });
    }

    try {
        const dispositivo = await getDispositivo(mac);

        if (!dispositivo || dispositivo.length === 0) {
            return response.status(404).json({
                next: false,
                message: 'NO SE ENCONTRO EL DISPOSITIVO.'
            });
        }

        const config = parseDeviceConfig(dispositivo[0].config);
        if (!config) {
            console.error('[HWARE][SENSOR] CONFIGURACION INVALIDA:', {
                mac,
                dispositivo_id: dispositivo[0].id || null
            });
            return response.status(500).json({
                next: false,
                message: 'LA CONFIGURACION DEL DISPOSITIVO NO ES UN JSON VALIDO.'
            });
        }

        return response.status(200).json({
            message: 'CONFIGURACION OBTENIDA EXITOSAMENTE.',
            next: true,
            config
        });
    } catch (error) {
        console.error('[HWARE][SENSOR] ERROR AL OBTENER CONFIGURACION:', error);
        return response.status(500).json({
            next: false,
            message: 'ERROR INTERNO AL OBTENER LA CONFIGURACION DEL DISPOSITIVO.'
        });
    }
};

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
            const config = parseDeviceConfig(_dispositivo[0].config);
            if (!config) {
                return response.status(500).json({
                    next: false,
                    message: 'LA CONFIGURACION DEL DISPOSITIVO NO ES UN JSON VALIDO.'
                });
            }

            // INSERTARMOS REGISTROS
            const _store_registro = await store({
                'id_dispositivo_lector': _dispositivo[0].id
            });
            if(_store_registro){
                // RESPUESTA EXITOSA CON LOS PERFILES OBTENIDOS
                return response.status(200).json({
                    message: 'REGISTRO EXITOSO.',
                    next: true,
                    config
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
    const { mac_eth } = request.body; //Extraccion de la direccion mac
    console.log('body:', request.body);

    if (!uuid) {
        return response.status(400).json({
            next: false,
            message: "LA UUID ES NECESARIA"
        });
    }

    if (!mac_eth) {
        return response.status(400).json({
            next: false,
            message: "LA DIRECCION MAC ES NECESARIA"
        });
    }

    try {
        // OBTENER EL USUARIO DESDE LA BASE DE DATOS
        const _tarjeta = await getTarjeta(uuid);
        const _dispositivo = await getDispositivo(mac_eth);
        const _perfil = await getPerfil(uuid);

        //VALIDAR SI EXISTE Y ES VALIDA LA TARJETA
        if(!_tarjeta || _tarjeta.length === 0){

            // Manejo de caso en que no se obtengan resultados
            return response.status(404).json({
                next: false,
                message: "NO SE ENCONTRO LA TARJETA."
            });

        }else{

            let statusTarjeta = parseInt(_tarjeta[0].status_alta);
            if(statusTarjeta === 1){
                //VALIDAR SI EXISTE EL DISPOSITIVO
                if(!_dispositivo || _dispositivo.length === 0 ){

                    // Manejo de caso en que no se encuentre el dispositivo
                    return response.status(404).json({
                        next: false,
                        message: "NO SE ENCONTRÓ EL DISPOSITIVO"
                    });

                }else{

                    //VALIDAR DE QUE EXISTA UN PERFIL ASOCIADO A LA TARJETA
                    if (!_perfil || _perfil.length === 0) {

                        // Manejo de caso en que no se obtengan resultados
                        return response.status(404).json({
                            next: false,
                            message: "NO SE ENCONTRÓ UN PERFIL ASOCIADO A UNA TARJETA"
                        });

                    }else{
                        console.log(_perfil);
                        // VERIFICAMOS QUE EXISTA UNA CONFIGURACION
                        let _config = JSON.parse(_dispositivo[0].config);

                        // INSERTARMOS REGISTROS
                        const _store_registro = await store({
                            'id_dispositivo_lector': _dispositivo[0].id,
                            'id_perfil': _perfil[0].id_perfil,
                            'id_tarjeta_rfid': _tarjeta[0].id
                        });

                        if(_store_registro){

                            // RESPUESTA EXITOSA CON LOS PERFILES OBTENIDOS
                            return response.status(200).json({
                                message: 'REGISTRO EXITOSO.',
                                next: true,
                                config: _config
                            });

                        }else{

                            return response.status(200).json({
                                message: 'HUBO UN ERROR EN EL SERVIDOR.',
                                next: false
                            });

                        }
                    }

                }

            }else{

                // Manejo de caso en que la tarjeta es inactiva
                return response.status(404).json({
                    next: false,
                    message: "LA TARJETA SE ENCUENTRA DESHABILITADA"
                });

            }

        }

    } catch (error) {
        console.log(error.message);
        return response.status(500).json({
            next: false,
            message: 'Error al insertar',
            error: error.message // O puedes remover esto en producción
        });
    }

};

module.exports = {
    post_sensor,
    get_sensor_config,
    post_uuid
}
