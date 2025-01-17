
const { web_today } = require('../models/eventos');

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
                case 'data':
                    
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
                    data: _return,
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





module.exports = {
    sockeTConnect
}

