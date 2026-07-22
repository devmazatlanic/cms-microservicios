const { getPantallabyId, getPantallabyToken, createPantalla, getPlaylisPantallabyToken, getDefaultPlaylist } = require('../models/pantallas');
const { get_mac_address } = require('../helpers/tools');
const macaddress = require('macaddress');
const { getAirplayPresenceSnapshot, resolveAirplayRefreshTargets, pushAirplayPlaylistRefresh } = require('../helpers/sockets');

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

const get_pantalla_by_token = async (request, response) => {
    const { token } = request.body;

    if (!token) {
        return response.status(500).json({
            message: 'DEBE DE ENVIAR EL TOKEN DE LA PANTALLA.'
        });
    }

    try {
        const pantalla = await getPantallabyToken(token);
        if (!pantalla) {
            return response.status(404).json({
                message: 'No se encontró la pantalla'
            });
        }

        response.json({
            message: 'GET API - PANTALLAS',
            pantalla: pantalla
        });

    } catch (error) {
        return response.status(500).json({
            message: `No se encontró la pantalla: ${error.message}`
        });
    }
};

const store_pantalla = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            next: false,
            message: "EL TOKEN ES NECESARIO"
        });
    }

    const encontrado = await getPantallabyToken(token);

    if (encontrado.length === 0) {
        const _store_registro = await createPantalla({
            'token': token
        });

        if (_store_registro) {
            // RESPUESTA EXITOSA AL CREAR LA PANTALLA
            return res.status(200).json({
                message: 'REGISTRO EXITOSO.',
                next: true,
                token: token
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
        message: "YA EXISTE UNA PANTALLA CON ESTE TOKEN REGISTRADO"
    });

};

const get_socket_airplay_status = async (_request, response) => {
    try {
        const snapshot = getAirplayPresenceSnapshot();

        return response.status(200).json({
            next: true,
            message: 'SOCKET AIRPLAY STATUS.',
            summary: {
                total_screens: snapshot.total_screens,
                total_sockets: snapshot.total_sockets
            },
            response: snapshot.screens,
            recent_events: snapshot.recent_events
        });
    } catch (error) {
        return response.status(500).json({
            next: false,
            message: `NO FUE POSIBLE OBTENER EL ESTADO DEL SOCKET AIRPLAY: ${error.message}`
        });
    }
};

const refresh_socket_airplay_playlist = async (request, response) => {
    try {
        const payload = request.body || {};
        const reason = String(payload.reason || '').trim();
        const targets = await resolveAirplayRefreshTargets({
            tokens: payload.tokens,
            playlist_id: payload.playlist_id,
            refresh_default_consumers: payload.refresh_default_consumers === true
        });

        const emitted = await pushAirplayPlaylistRefresh({
            io: request.io,
            tokens: targets,
            reason,
            metadata: {
                playlist_id: payload.playlist_id || null,
                refresh_default_consumers: payload.refresh_default_consumers === true
            }
        });

        return response.status(200).json({
            next: true,
            message: 'SOCKET AIRPLAY REFRESH PROCESADO.',
            requested: {
                tokens: Array.isArray(payload.tokens) ? payload.tokens : [],
                playlist_id: payload.playlist_id || null,
                refresh_default_consumers: payload.refresh_default_consumers === true,
                reason: reason || null
            },
            summary: {
                total_targets: targets.length,
                total_emitted: emitted.filter((item) => item.emitted).length,
                total_connected: emitted.filter((item) => item.connected).length
            },
            response: emitted
        });
    } catch (error) {
        return response.status(500).json({
            next: false,
            message: `NO FUE POSIBLE PROCESAR EL REFRESH DEL SOCKET AIRPLAY: ${error.message}`
        });
    }
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
            let { token } = _response;
            console.log('MENSAJE RECIBIDO:', _response);

            try {
                const encontrarPantalla = await getPantallabyToken(token);
                console.log(encontrarPantalla);
                if (encontrarPantalla.length > 0) {
                    // SI LA PANTALLA EXISTE, BUSCAMOS LA PLAYLIST ASOCIADA
                    const contenidoPantalla = await getPlaylisPantallabyToken(token);
                    if (contenidoPantalla.length > 0) {
                        _return.playlist = contenidoPantalla;
                        _return.next = true;
                        _return.message = `SE ENCONTRO UNA PLAYLIST ASOCIADA A LA PANTALLA CON EL TOKEN: ${token} EXITOSAMENTE.`;
                    } else {
                        // SI NO HAY PLAYLIST ASOCIADA A LA PANTALLA, INTENTAMOS OBTNENER LA PLAYLIST DEFAULT
                        const defaulPlaylist = await getDefaultPlaylist();
                        if (defaulPlaylist.length > 0) {
                            _return.playlist = defaulPlaylist;
                            _return.next = true;
                            _return.message = "SE ENCONTRÓ PLAYLIST DEFAULT";
                        } else {
                            _return.message = "NO SE ENCONTRO UNA PLAYLIST DEFAULT";
                            _return.next = false;
                        }
                    }
                } else {
                    // SINO LA ENCUENTRA LA PANTALLA, QUIERE DECIR QUE NO EXISTE, ENTONCES LA REGISTRAMOS                   
                    const _store_registro = await createPantalla({ 'token': token });
                    if(_store_registro){  _return.message = `SE ACABA DE CREAR ESTA NUEVA PANTALLA: ${token} EXITOSAMENTE.`; }
                }

                // ENVIAMOS LA RESPUESTA AL CLIENTE
                _socket.emit(_data.server, _return);

            } catch (error) {
                console.log(error);
                // MANEJO DE ERRORES
                console.error('Error al procesar la solicitud:', error);
                _return.message = 'Hubo un error al procesar la solicitud.';
                _return.next = false;
                _socket.emit(_data.server, _return);
            }
        });

        // EVENTO WEB SOCKET DESCONOXION DEL SOCKET
        _socket.on('disconnect', () => {
            console.log('Cliente desconectado:', clientId);
        });
    });
};

module.exports = {
    get_pantalla_by_id,
    get_pantalla_by_token,
    store_pantalla,
    get_socket_airplay_status,
    refresh_socket_airplay_playlist,
    socket_pantalla
};
