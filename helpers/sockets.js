
const { web_today } = require('../models/eventos');
const { getPantallabyToken, getPlaylisPantallabyToken, createPantalla, getDefaultPlaylist } = require('../models/pantallas');

const sockeTConnect = async (_data = { io: null, client: '', server: '' }) => {
    _data.io.on('connection', (_socket) => {
        // console.log('CLIENTE CONECTADO:', _socket.id);
        const clientId = _socket.handshake.query.clientId; // Obtener el ID único enviado por el cliente
        console.log('CLIENTE CONECTADO ID:', clientId);
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
        let _return = { message: 'HUBO UN PROBLEMA PARA MOSTRAR EL CONTENIDO DEL PLAYLIST.', next: false };
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
                        console.log("encontro paylist");
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
    sockeTConnect
}

