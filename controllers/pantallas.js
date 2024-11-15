const {getPantallabyId, getPantallabyMac, createPantalla, getPlaylisPantallabyMac} = require('../models/pantallas');
const {get_mac_address} = require('../controllers/tools');
const macaddress = require('macaddress');

const get_pantalla_by_id = async (request, response) => {
    const {id} = request.body;

    if(!id){
        return response.status(500).json({
            message: 'Debe enviar el id de la pantalla.'
        });
    }

    try {
        // OBTENEMOS LA PANTALLA DESDE LA BASE DE DATOS
        const pantalla = await getPantallabyId(id);
        if(!pantalla){
            return response.status(404).json({
                message: 'No se encontró la pantalla.'
            });
        }

        // ENVIAMOS LA RESPUESTA JSON CON LOS DATOS EXTRAIDOS
        response.json({
            message: 'GET API - PANTALLAS',
            pantalla: pantalla
        });

    }catch(e){
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

        if(_store_registro){
            // RESPUESTA EXITOSA AL CREAR LA PANTALLA
            return res.status(200).json({
                message: 'REGISTRO EXITOSO.',
                next: true,
                mac_address: mac 
            });
        }else{
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
const socket_pantalla = async (socket, io, _data = {}) => {

    socket.on(_data.socket, async () => {

        try {
            const mac = await get_mac_address();
            console.log('MAC address:', mac);

            const encontrarPantalla = await getPantallabyMac(mac);

            //BUSCAMOS SI YA TENEMOS REGISTRADO LA PANTALLA CON LA MAC ADDRESS OBTENIDO
            if (encontrarPantalla.length > 0) {
                const contenidoPantalla = await getPlaylisPantallabyMac(mac);
                if (contenidoPantalla.length === 0 ){
                    socket.emit('playlist_response', { message: `No se ha encontado un playlist asociada a esta pantalla con mac addres: ${mac}`, data: [] });
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
                    socket.emit('playlist_response', { message: `se guardo la pantalla per no se encontro un playlist asociado a esta pantalla con mac addres: ${mac}`, data: false });
                }
            }
            io.emit('MAC_response', { message: `Mac address: ${mac}` });
        } catch (error) {
            io.emit('MAC_response', { message: 'Error al obtener la MAC address' });
            socket.emit('playlist_response', { message: `No hay playlist para esta pantalla ${error.mess}` , data: false });
        }
    });
};

module.exports = {
    get_pantalla_by_id,
    get_pantalla_by_mac,
    get_mac_address,
    store_pantalla,
    socket_pantalla
};