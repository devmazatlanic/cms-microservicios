const { request, response } = require('express');
const { send_message } = require('../helpers/whatsapp');
const { message_text, message_document, message_templete } = require("../shared/whatsapp/custom_message");
const { buildComponent } = require("../helpers/tools");
// const { getPerfiles } = require('../models/perfiles');

const verify_token = (request, response) => {
    const VERIFY_TOKEN = "miclave123"; // mismo que pusiste en Meta
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return response.status(200).send(challenge); // texto plano, no JSON
    } else {
        return response.sendStatus(403);
    }
};

const received_message = (request, response) => {
    const body = request.body;
    // console.log("Mensaje recibido de Meta:", body.entry[0].changes[0].value.statuses[0]);

    try{
        let _entry = body['entry'][0];
        let _changes = _entry['changes'][0];
        let _value = _changes['value'];
        let _messageObject = _value['messages'];

        if(typeof _messageObject != "undefined"){
            let _messages = _messageObject[0];
            let _text = GetTextUser(_messages);
            let _from = _messages.from;
            let _id_context = _messages.context.id;

            // console.log("Mensaje recibido de Meta:", body.entry[0].changes[0].value.messages[0]);
            console.log('_from: ', _from);
            console.log('_text: ', _text);
            console.log('_id_context: ', _id_context);

            // VALIDAMOS EL TIPO DE RESPUESTA
            // NECESIDADES: SABER QUE TIPO DE DOCUMENTO ES O VER EL IDENTIFICADOR
            switch (_text) {
                case 'Si':
                    let _model = message_document({
                        number: _from,
                        url: 'http://cdn.mztmic.com:8000/ordenes_servicios/01_AGOSTO_CEREMONIA_AYAHUASCA_20200724165530.pdf'
                    }); 

                    send_message(_model);
                    break;
            }
        }

        response.sendStatus(200);
    }catch(error){
        response.sendStatus(400);
    }
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

const send_notification = (request, response) => {
    try {
        const body = request.body;
        // console.log('send_notification: ', body);
        let _model = {};

        if(!body.type?.trim() || !body.phone_number?.trim()){
            return response.status(400).json({
                next: false,
                message: 'Los campos obligatorios son los siguientes y no deben de estar vacios: type, phone_number.'
            });
        }
        
        switch (body.type) {
            case "document":
                if(!body.url?.trim()){
                    return response.status(400).json({
                        next: false,
                        message: 'El campo url es obligatorio y no debe de estar vacio.'
                    });
                }

                _model = message_document({
                    number: body.phone_number,
                    url: body.url
                });
                break;

            case "template":
                if(!body.name?.trim()){
                    return response.status(400).json({
                        next: false,
                        message: 'El campo name es obligatorio y no debe de estar vacio.'
                    });
                }
                
                // CONDICIONES PARA SABER QUE PLANTILLA ES
                switch (body.name) {
                    case 'ordenservicio':
                        if (!Array.isArray(body.components) || body.components.length === 0) {
                            return response.status(400).json({
                              next:    false,
                              message: 'El campo components es obligatorio y debe ser un arreglo con al menos un elemento.'
                            });
                        }
                        break;
                }

                let _config = {
                    number: body.phone_number,
                    name: body.name,
                    language_code: 'es'
                };

                // Si vienen parámetros para el body…
                if (Array.isArray(body.components) && body.components.length > 0) {
                    // envuelve el resultado en un array
                    _config.components = [
                        buildComponent("body", body.components)
                    ];
                }
                
                _model = message_templete(_config);

                break;
        
            default:
                if(!body.message?.trim()){
                    return response.status(400).json({
                        next: false,
                        message: 'El campo message es obligatorio y no debe de estar vacio.'
                    });
                }

                _model = message_text({
                    number: body.phone_number,
                    message: body.message
                });
                break;
        }

        // FUNCION QUE SE USA PARA REALIZAR EL ENVIO DE MENSAJE POR WHATSAPP
        send_message(_model);

        response.status(200).json({
            next: true,
            message: 'Su mensaje fue enviado con exito.'
        });
    } catch (error) {
        console.error(error);
        response.status(400).json({
            next: false,
            message: 'Hubo un error al ejecutar la aplicacioón para enviar mensaje por whatsapp.'
        });
    }
}


module.exports = {
    verify_token,
    received_message,
    send_notification
}