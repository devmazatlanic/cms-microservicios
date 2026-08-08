const { web_today } = require('../models/eventos');
const { getPantallabyToken, getPlaylisPantallabyToken, createPantalla, getPantallaTokensByPlaylistId, getDefaultPlaylist } = require('../models/pantallas');

const airplayPresence = new Map();
const airplaySocketIndex = new Map();
const airplayRecentEvents = [];
const AIRPLAY_RECENT_EVENTS_LIMIT = 50;
const AIRPLAY_RESPONSE_EVENT = 'response';

const toIsoString = (value) => {
    if (!value) {
        return null;
    }

    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const buildAirplayPresenceSummary = (token, presence) => ({
    token,
    socket_ids: Array.from(presence.socketIds),
    total_sockets: presence.socketIds.size,
    connected_at: toIsoString(presence.connectedAt),
    last_seen_at: toIsoString(presence.lastSeenAt),
    last_disconnect_at: toIsoString(presence.lastDisconnectAt),
    last_disconnect_reason: presence.lastDisconnectReason || null
});

const pushAirplayRecentEvent = (type, data = {}) => {
    airplayRecentEvents.unshift({
        type,
        timestamp: new Date().toISOString(),
        ...data
    });

    if (airplayRecentEvents.length > AIRPLAY_RECENT_EVENTS_LIMIT) {
        airplayRecentEvents.length = AIRPLAY_RECENT_EVENTS_LIMIT;
    }
};

const markAirplayPresence = ({ token, socketId, clientId }) => {
    const normalizedToken = String(token || '').trim();
    const normalizedSocketId = String(socketId || '').trim();
    const normalizedClientId = String(clientId || '').trim() || normalizedToken;

    if (!normalizedToken || !normalizedSocketId) {
        return null;
    }

    const now = new Date();
    const currentPresence = airplayPresence.get(normalizedToken) || {
        token: normalizedToken,
        socketIds: new Set(),
        clientIds: new Set(),
        connectedAt: now,
        lastSeenAt: now,
        lastDisconnectAt: null,
        lastDisconnectReason: null
    };

    const isNewSocket = !currentPresence.socketIds.has(normalizedSocketId);

    currentPresence.socketIds.add(normalizedSocketId);
    currentPresence.clientIds.add(normalizedClientId);
    currentPresence.lastSeenAt = now;

    if (!currentPresence.connectedAt) {
        currentPresence.connectedAt = now;
    }

    airplayPresence.set(normalizedToken, currentPresence);
    airplaySocketIndex.set(normalizedSocketId, {
        token: normalizedToken,
        clientId: normalizedClientId
    });

    return {
        isNewSocket,
        presence: buildAirplayPresenceSummary(normalizedToken, currentPresence)
    };
};

const markAirplayDisconnect = (socketId, reason = '') => {
    const normalizedSocketId = String(socketId || '').trim();
    if (!normalizedSocketId || !airplaySocketIndex.has(normalizedSocketId)) {
        return null;
    }

    const socketInfo = airplaySocketIndex.get(normalizedSocketId);
    const presence = airplayPresence.get(socketInfo.token);

    airplaySocketIndex.delete(normalizedSocketId);

    if (!presence) {
        return null;
    }

    presence.socketIds.delete(normalizedSocketId);
    presence.lastSeenAt = new Date();

    if (presence.socketIds.size === 0) {
        presence.lastDisconnectAt = new Date();
        presence.lastDisconnectReason = String(reason || '').trim() || 'unknown';
        airplayPresence.delete(socketInfo.token);

        return {
            token: socketInfo.token,
            clientId: socketInfo.clientId,
            disconnected: true,
            presence: buildAirplayPresenceSummary(socketInfo.token, {
                ...presence,
                socketIds: new Set()
            })
        };
    }

    return {
        token: socketInfo.token,
        clientId: socketInfo.clientId,
        disconnected: false,
        presence: buildAirplayPresenceSummary(socketInfo.token, presence)
    };
};

const getAirplayPresenceSnapshot = () => {
    const screens = Array.from(airplayPresence.entries()).map(([token, presence]) =>
        buildAirplayPresenceSummary(token, presence)
    );

    return {
        total_screens: screens.length,
        total_sockets: screens.reduce((total, screen) => total + screen.total_sockets, 0),
        screens,
        recent_events: airplayRecentEvents.slice(0, AIRPLAY_RECENT_EVENTS_LIMIT)
    };
};

const normalizeTokenList = (tokens = []) => {
    if (!Array.isArray(tokens)) {
        return [];
    }

    return Array.from(new Set(
        tokens
            .map((token) => String(token || '').trim())
            .filter(Boolean)
    ));
};

const resolveAirplayPlaylistResponse = async (token, options = {}) => {
    const normalizedToken = String(token || '').trim();
    const allowAutoCreate = options.allowAutoCreate !== false;
    let response = { message: 'HUBO UN PROBLEMA PARA MOSTRAR EL CONTENIDO DEL PLAYLIST.', next: false };

    if (!normalizedToken) {
        response.message = 'EL TOKEN DE LA PANTALLA ES NECESARIO.';
        return response;
    }

    const encontrarPantalla = await getPantallabyToken(normalizedToken);
    if (encontrarPantalla.length > 0) {
        const contenidoPantalla = await getPlaylisPantallabyToken(normalizedToken);
        if (contenidoPantalla.length > 0) {
            response.playlist = contenidoPantalla;
            response.next = true;
            response.message = `SE ENCONTRO UNA PLAYLIST ASOCIADA A LA PANTALLA CON EL TOKEN: ${normalizedToken} EXITOSAMENTE.`;
            response.source_type = 'assigned_playlist';
            return response;
        }

        const defaulPlaylist = await getDefaultPlaylist();
        if (defaulPlaylist.length > 0) {
            response.playlist = defaulPlaylist;
            response.next = true;
            response.message = 'SE ENCONTRÓ PLAYLIST DEFAULT';
            response.source_type = 'default_playlist';
            return response;
        }

        response.message = 'NO SE ENCONTRO UNA PLAYLIST DEFAULT';
        response.source_type = 'empty';
        return response;
    }

    if (allowAutoCreate) {
        console.warn('[SOCKET][AIRPLAY] PANTALLA NO REGISTRADA, SE INTENTARA ALTA AUTOMATICA:', {
            token: normalizedToken
        });
        const storeRegistro = await createPantalla({ token: normalizedToken });
        if (storeRegistro) {
            response.message = `SE ACABA DE CREAR ESTA NUEVA PANTALLA: ${normalizedToken} EXITOSAMENTE.`;
        }
    } else {
        response.message = `NO SE ENCONTRO LA PANTALLA CON EL TOKEN: ${normalizedToken}.`;
    }

    response.source_type = 'screen_not_found';
    return response;
};

const getConnectedAirplayTokens = () => Array.from(airplayPresence.keys());

const getDefaultConsumerTokens = async () => {
    const connectedTokens = getConnectedAirplayTokens();
    const defaultConsumers = [];

    for (const token of connectedTokens) {
        const assignedPlaylist = await getPlaylisPantallabyToken(token);
        if (!assignedPlaylist || assignedPlaylist.length === 0) {
            defaultConsumers.push(token);
        }
    }

    return defaultConsumers;
};

const resolveAirplayRefreshTargets = async (criteria = {}) => {
    const targetTokens = new Set(normalizeTokenList(criteria.tokens));
    const playlistId = Number.parseInt(criteria.playlist_id, 10);

    if (Number.isFinite(playlistId) && playlistId > 0) {
        const playlistTokens = await getPantallaTokensByPlaylistId(playlistId);
        playlistTokens.forEach((item) => {
            const token = String(item?.token || '').trim();
            if (token) {
                targetTokens.add(token);
            }
        });
    }

    if (criteria.refresh_default_consumers === true) {
        const defaultConsumers = await getDefaultConsumerTokens();
        defaultConsumers.forEach((token) => targetTokens.add(token));
    }

    return Array.from(targetTokens);
};

const pushAirplayPlaylistRefresh = async ({ io, tokens = [], reason = '', metadata = {} } = {}) => {
    if (!io) {
        throw new Error('SOCKET.IO NO DISPONIBLE PARA REALIZAR EL REFRESH AIRPLAY.');
    }

    const normalizedTokens = normalizeTokenList(tokens);
    const results = [];

    for (const token of normalizedTokens) {
        const presence = airplayPresence.get(token);
        if (!presence || presence.socketIds.size === 0) {
            console.warn('[SOCKET][AIRPLAY] REFRESH OMITIDO: SOCKET NO CONECTADO:', {
                token,
                reason: String(reason || '').trim() || null
            });
            results.push({
                token,
                emitted: false,
                connected: false,
                total_sockets: 0
            });
            continue;
        }

        const payload = await resolveAirplayPlaylistResponse(token, { allowAutoCreate: false });
        payload.refresh_reason = String(reason || '').trim() || null;
        payload.refresh_metadata = metadata;
        payload.refreshed_at = new Date().toISOString();

        Array.from(presence.socketIds).forEach((socketId) => {
            io.to(socketId).emit(AIRPLAY_RESPONSE_EVENT, payload);
        });

        pushAirplayRecentEvent('playlist_refresh', {
            token,
            reason: payload.refresh_reason,
            total_sockets: presence.socketIds.size
        });

        console.log('[SOCKET][AIRPLAY] PLAYLIST REFRESH EMITIDO:', {
            token,
            reason: payload.refresh_reason,
            total_sockets: presence.socketIds.size
        });

        results.push({
            token,
            emitted: true,
            connected: true,
            total_sockets: presence.socketIds.size,
            source_type: payload.source_type || null
        });
    }

    return results;
};

const sockeTConnect = async (_data = { io: null, client: '', server: '' }) => {
    _data.io.on('connection', (_socket) => {
        const clientId = _socket.handshake.query.clientId; // Obtener el ID único enviado por el cliente
        const clientType = String(_socket.handshake.query.client || '').trim().toLowerCase();

        console.log('[SOCKET] CLIENTE CONECTADO:', {
            socket_id: _socket.id,
            client_id: clientId || null,
            client: clientType || null
        });

        // Enviar el ID al cliente si es necesario
        _socket.emit('connected', clientId);
        // BUSCAMOS NOMBRE DEL SOCKET DEL CLIENTE
        _data.client.forEach(element => {
            switch (element) {
                case 'airplay':
                    private_pantallas_local({
                        socket: _socket,
                        client: element,
                        server: _data.server
                    });
                    break;
                case 'siteweb': // SITIWEB LOCAL PARA PANTALLAS
                    private_siteweb_local({
                        socket: _socket,
                        client: element,
                        server: _data.server
                    });
                    break;
            }
        });

        _socket.on('disconnect', (reason) => {
            const disconnectedAirplay = markAirplayDisconnect(_socket.id, reason);
            if (disconnectedAirplay) {
                pushAirplayRecentEvent('disconnected', {
                    token: disconnectedAirplay.token,
                    client_id: disconnectedAirplay.clientId,
                    socket_id: _socket.id,
                    reason: reason || 'unknown',
                    remaining_sockets: disconnectedAirplay.presence.total_sockets
                });
                console.log('[SOCKET][AIRPLAY] CLIENTE DESCONECTADO:', {
                    token: disconnectedAirplay.token,
                    client_id: disconnectedAirplay.clientId,
                    socket_id: _socket.id,
                    reason: reason || 'unknown',
                    remaining_sockets: disconnectedAirplay.presence.total_sockets
                });
                if (disconnectedAirplay.disconnected && typeof _data.onAirplayDisconnected === 'function') {
                    Promise.resolve(_data.onAirplayDisconnected(disconnectedAirplay)).catch((error) => {
                        console.error('[SOCKET][AIRPLAY] ERROR AL PROGRAMAR ALERTA DE DESCONEXION:', error);
                    });
                }
                return;
            }

            console.log('[SOCKET] CLIENTE DESCONECTADO:', {
                socket_id: _socket.id,
                client_id: clientId || null,
                client: clientType || null,
                reason: reason || 'unknown'
            });
        });
    });
};

const private_siteweb_local = async (_data = {}) => {

    _data.socket.on(_data.client, async (_response) => {
        // console.log('MENSAJE RECIBIDO:', _response);
        try {
            // MOSTRAREMOS LISTA DE EVENTOS ACTIVOS
            const eventos = await web_today();

            if (!eventos || eventos.length === 0) {                
                // ENVIAMOS LA RESPUESTA AL CLIENTE
                _data.socket.emit(_data.server, {
                    message: 'No encontro eventos para mostrar el día de hoy.',
                    next: false
                });
            } else {
                // EXTRAEMOS LOS DATOS RELEVANTES DE LA RESPUESTA DE LA BASE DE DATOS
                const _eventos = eventos.map(_element => ({
                    evento: _element.evento,
                    fecha: _element.fecha,
                    image: `data:image/png;base64,${_element.image}`,
                    salones: _element.salones
                }));

                // ENVIAMOS LA RESPUESTA AL CLIENTE
                _data.socket.emit(_data.server, {
                    data: _eventos,
                    next: true
                });
            }
        } catch (error) {
            // MANEJO DE ERRORES
            console.error('Error al procesar la solicitud:', error);
            _data.socket.emit(_data.server, {
                message: 'Hubo un error al procesar la solicitud.',
                next: false
            });
        }
    });

};

const private_pantallas_local = async (_data = {}) => {

    _data.socket.on(_data.client, async (_response) => {
        let { token } = _response;
        token = String(token || '').trim();
        let _return = { message: 'HUBO UN PROBLEMA PARA MOSTRAR EL CONTENIDO DEL PLAYLIST.', next: false };
        if (!token) {
            _return.message = 'EL TOKEN DE LA PANTALLA ES NECESARIO.';
            _data.socket.emit(_data.server, _return);
            return;
        }

        const presenceUpdate = markAirplayPresence({
            token,
            socketId: _data.socket.id,
            clientId: _data.socket.handshake.query.clientId
        });

        if (presenceUpdate && typeof _data.onAirplayConnected === 'function') {
            try {
                _data.onAirplayConnected({
                    token,
                    socket_id: _data.socket.id,
                    total_sockets: presenceUpdate.presence.total_sockets
                });
            } catch (error) {
                console.error('[SOCKET][AIRPLAY] ERROR AL CANCELAR ALERTA DE DESCONEXION:', error);
            }
        }

        if (presenceUpdate?.isNewSocket) {
            pushAirplayRecentEvent('connected', {
                token,
                socket_id: _data.socket.id,
                total_sockets: presenceUpdate.presence.total_sockets
            });
            console.log('[SOCKET][AIRPLAY] CLIENTE IDENTIFICADO:', {
                token,
                socket_id: _data.socket.id,
                total_sockets: presenceUpdate.presence.total_sockets
            });
        }

        try {
            _return = await resolveAirplayPlaylistResponse(token, { allowAutoCreate: true });

            // ENVIAMOS LA RESPUESTA AL CLIENTE
            _data.socket.emit(_data.server, _return);

        } catch (error) {
            // MANEJO DE ERRORES
            console.error('Error al procesar la solicitud:', error);
            _return.message = 'Hubo un error al procesar la solicitud.';
            _return.next = false;
            _data.socket.emit(_data.server, _return);
        }
    });
}

module.exports = {
    sockeTConnect,
    getAirplayPresenceSnapshot,
    resolveAirplayRefreshTargets,
    pushAirplayPlaylistRefresh
}
