
const sockeTConnect = async (_data = { io: null, client: '', server: '' }) => {
    _data.io.on('connection', (_socket) => {
        console.log('CLIENTE CONECTADO:', _socket.id);
        // Ejemplo de evento
        _socket.on(_data.client, (_response) => {
            console.log('MENSAJE RECIBIDO:', _response);

            _socket.emit(_data.server, { message: 'Hola desde el servidor!' });
        });
    });
};

module.exports = {
    sockeTConnect
}

