const{createPantalla, getPantallabyMac, getPlaylisPantallabyMac} = require('../models/pantallas');
const {get_mac_address} = require('../controllers/tools');

const sockeTConnect = async (socket, io, _data = {}) => {

    socket.on(_data.socket, async () => {

        try {
            const mac = await get_mac_address();
            console.log('MAC address:', mac);

            const encontrarPantalla = await getPantallabyMac(mac);

            //BUSCAMOS SI YA TENEMOS REGISTRADO LA PANTALLA CON LA MAC ADDRESS OBTENIDO
            if (encontrarPantalla.length > 0) {
                const contenidoPantalla = await getPlaylisPantallabyMac(mac);
                if (contenidoPantalla.length === 0 ){
                    socket.emit('playlist_response', { message: 'No se ha encontado un playlist asociada a esta pantalla', data: [] });
                }else{
                    socket.emit('playlist_response', { message: 'Se encontró la pantalla con contenido', data: contenidoPantalla });
                }
            } else {
                //SINO SE ENCUENTRA, RESGISTRAMOS LA NUEVA PANTALLA/DISP CON ESA MAC ADDESS
                const _store_registro = await createPantalla({
                    'mac_address': mac
                });

                if(_store_registro) {
                    //AQUI YA SE REGISTRO LA PANTALLA PERO AL SER NUEVA NO HAY UNA PLAYLIST ASIGNADA 
                    socket.emit('playlist_response', { message: 'No hay playlist para esta pantalla', data: false });
                }
            }
            io.emit('MAC_response', { message: `Mac address: ${mac}` });
        } catch (error) {
            io.emit('MAC_response', { message: 'Error al obtener la MAC address' });
            socket.emit('playlist_response', { message: 'No hay playlist para esta pantalla', data: false });
        }
    });
};

module.exports = {
    sockeTConnect
}

