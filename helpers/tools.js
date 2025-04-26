const macaddress = require('macaddress');
const { get_message } = require('../models/whatsapp');
const { message_text, message_document } = require("../shared/whatsapp/custom_message");

const get_mac_address = async () => {
    try {
        const mac = await new Promise((resolve, reject) => {
            macaddress.one((err, mac) => {
                if (err) {
                    reject(new Error(`No se pudo obtener la mac address: ${err.message}`));
                } else {
                    resolve(mac);
                }
            });
        });

        return mac;
    } catch (error) {
        throw new Error(`Error al obtener la MAC Address: ${error.message}`);
    }
};

// ---------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------
// FUNCIONES WHATSAPP
const buildComponent = (type = "body", texts = []) => {
    return {
        type,
        parameters: texts.map(text => ({
            type: "text",
            text
        }))
    };
};

const process_response = async(_message) => {
    let _text = GetTextUser(_message);
    let _from = _message.from;
    let _id_context = _message.context?.id;
    let _model = {};
    let _type = '';
    let _name = '';
    let _url = '';
    let _filename = '';
    let _caption = '';
    // console.log("Mensaje recibido de Meta:", body.entry[0].changes[0].value.messages[0]);

    // VALIDAMOS EL TIPO DE RESPUESTA Y PARA ESO, BUSCAMOS QUE EL ID CONTEXT EXISTA EN LA BASE DE DATOS: WHATSAPP_REQUETS
    if(_id_context){
        const _result = await get_message(_id_context);
        console.log('📦 Contexto obtenido:', _result[0]);

        if (_result.length === 0) {
            console.log('No se encontró contexto');
            return response.sendStatus(200);
        }

        const _row = _result[0];
        _type = _row?.type || '';
        _name = _row?.name || '';
        _url = _row?.url || null;
        _filename = _row?.filename || null;
        _caption = _row?.caption || null;
    }

    // REVISAMOS QUE TIPO DE MENSAJE ES
    switch (_type) {
        case 'template':
            // AHORA VALIDAMOS EL NOMBRE DE LA PLANTILLA QUE SE ESTA UTILIZANDO
            switch (_name) {
                case 'ordenservicio':
                    // LA PLANTILLA CUENTA CON BOTONES: SI
                    switch (_text.toUpperCase()) {
                        case 'SI':
                            // CREAMOS EL MODELO DE DATO
                            _model = message_document({
                                number: _from,
                                url: _url,
                                filename: _filename,
                                caption: _caption
                            });
                            break;
                        
                        default:
                            _model = message_text({
                                number: _from,
                                message: 'Lo sentimos, no existe un resultado para esta solicitud.'
                            });
                            break;
                    }
                    break;
            
                default:
                    console.log('Template no controlado:', _name);
                    break;
            }                    
            break;
    
        default:
            console.log('Tipo no controlado:', _type);
            break;
    }

    return _model;
}

const GetTextUser = (_message) => {
    let _text = '';
    let _typeMessage = _message['type'];

    switch (_typeMessage) {
        case 'text':
            _text = _message['text']['body'];
            break;
        
        case 'button':
            _text = _message['button'].text;
            break;
        
        case 'interactive':
            let _interactiveObject = _message['interactive'];
            let _interactiveType = _interactive['type'];

            switch (_interactiveType) {
                case 'button_reply':
                    _text = _interactiveObject['button_reply']['title'];
                    break;

                case 'list_reply':
                    _text = _interactiveObject['list_reply']['title'];
                    break;
            
                default:
                    console.log('_interactiveObject: ', _interactiveObject);
                    break;
            }
            break;
    
        default:
            console.log('_message: ', _message);
            break;
    }

    return _text;
}

// ---------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------

module.exports = {
    get_mac_address,
    buildComponent,
    process_response
}