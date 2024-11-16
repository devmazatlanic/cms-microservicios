
const sockeTConnect = async (_data = {}) => {
    _data.socket.on(_data.name, async () => {
        try {
            _data.io.emit('MAC_response', { message: 'SE CONECTO AL SERVIDOR' });
            _data.socket.emit('playlist_response', { message: 'SE CONECTO CON EL CLIENTE' });
        } catch (error) {
            _data.io.emit('MAC_response', { message: 'Error al obtener la MAC address' });
            _data.socket.emit('playlist_response', { message: 'No hay playlist para esta pantalla' });
        }
    });
};

module.exports = {
    sockeTConnect
}

