const { getPantallabyId, getPantallabyMac, createPantalla, getPlaylisPantallabyMac } = require('../models/pantallas');
const { get_mac_address } = require('../helpers/tools');
const macaddress = require('macaddress');

const get_pantalla_by_id = async (request, response) => {
    const { id } = request.body;

    if (!id) {
        return response.status(500).json({
            message: 'Debe enviar el id de la pantalla.'
        });
    }

    try {
        // OBTENEMOS LA PANTALLA DESDE LA BASE DE DATOS
        const pantalla = await getPantallabyId(id);
        if (!pantalla) {
            return response.status(404).json({
                message: 'No se encontró la pantalla.'
            });
        }

        // ENVIAMOS LA RESPUESTA JSON CON LOS DATOS EXTRAIDOS
        response.json({
            message: 'GET API - PANTALLAS',
            pantalla: pantalla
        });

    } catch (e) {
        throw new Error('No se encontró la pantalla', e);
    }
};

const get_pantalla_by_mac = async (request, response) => {
    const { mac } = request.body;

    if (!mac) {
        return response.status(500).json({
            message: 'Debe enviar la Mac Address de la pantalla.'
        });
    }

    try {
        // OBTENEMOS LA PANTALLA DESDE LA BASE DE DATOS
        const pantalla = await getPantallabyMac(mac);
        if (!pantalla) {
            return response.status(404).json({
                message: 'No se encontró la pantalla'
            });
        }

        // ENVIAMOS LA RESPUESTA JSON CON LOS DATOS EXTRAIDOS
        response.json({
            message: 'GET API - PANTALLAS',
            pantalla: pantalla
        });

    } catch (error) {
        // Pasamos solo el mensaje de error a Error
        return response.status(500).json({
            message: `No se encontró la pantalla: ${error.message}`
        });
    }
};

const store_pantalla = async (req, res) => {
    const { mac } = req.body;

    if (!mac) {
        return res.status(400).json({
            next: false,
            message: "La MAC-ADDRESS ES NECESARIA"
        });
    }

    const encontrado = await getPantallabyMac(mac);

    if (encontrado.length === 0) {
        const _store_registro = await createPantalla({
            'mac_address': mac
        });

        if (_store_registro) {
            // RESPUESTA EXITOSA AL CREAR LA PANTALLA
            return res.status(200).json({
                message: 'REGISTRO EXITOSO.',
                next: true,
                mac_address: mac
            });
        } else {
            return res.status(500).json({
                message: 'HUBO UN ERROR EN EL SERVIDOR',
                next: false
            });
        }
    }

    return res.status(400).json({
        next: false,
        message: "YA EXISTE UNA PANTALLA CON ESTA MAC-ADDRESS YA REGISTRADA"
    });

};

//conexion socket
const socket_pantalla = async (_data = {}) => {
    let _return = { message: 'NO SE PUDO ESTABLECER CONEXION A LAS LISTAS DE REPRODUCCION.', next: false };

    _data.io.on('connection', (_socket) => {
        const clientId = _socket.handshake.query.clientId; // Obtener el ID único enviado por el cliente
        console.log('Cliente conectado con ID persistente:', clientId);

        // Enviar el ID al cliente si es necesario
        _socket.emit('connected', clientId);

        // CONEXION HACIA LA PANTALLA - RESPUESTA: ON
        _socket.on(_data.client, async (_response) => {
            let { mac_address } = _response;
            
            console.log('MENSAJE RECIBIDO:', _response);

            const encontrarPantalla = await getPantallabyMac(mac_address);
            // VALIDAMOS QUE EXISTA LA PANTALLA, EN CASO DE QUE NO, LA REGISTRAMOS DE MANERA AUTOMATICA
            if (encontrarPantalla.length > 0) {
                // AHORA BUSCAMOS UNA LISTA DE REPRODUCCION CARGADA A LA PANTALLA
                const contenidoPantalla = await getPlaylisPantallabyMac(mac_address);
                if (contenidoPantalla.length !== 0) {
                    _return.playlist = contenidoPantalla;
                    _return.next = true;
                    _return.message = "SE ENCONTRO UNA PLAYLIST ASOCIADA A LA PANTALLA CON MAC_ADDRESS :" + mac_address + " EXITOSAMENTE.";
                }
            } else {
                //SINO SE ENCUENTRA, RESGISTRAMOS LA NUEVA PANTALLA/DISP CON ESA MAC ADDESS
                const _store_registro = await createPantalla({
                    'mac_address': mac_address
                });

                _return.message = "SE ACABA DE CREAR ESTA NUEVA PANTALLA " + mac_address + " EXITOSAMENTE.";
            }

            // ENVIAMOS RESPPUESTA A LA PANTALLA: EMIT
            _socket.emit(_data.server, _return);

            _socket.on('disconnect', () => {
                console.log('Cliente desconectado:', clientId);
            });
        });
    });
};

module.exports = {
    get_pantalla_by_id,
    get_pantalla_by_mac,
    get_mac_address,
    store_pantalla,
    socket_pantalla
};