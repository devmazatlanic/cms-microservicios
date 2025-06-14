const { request, response } = require('express');
const { send_message } = require('../helpers/whatsapp');
const { message_text, message_document, message_templete } = require("../shared/whatsapp/custom_message");
const { buildComponent, process_response } = require("../helpers/tools");

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

const received_message = async (request, response) => {
    const body = request.body;
    // console.log("Mensaje recibido de Meta:", body.entry[0].changes[0].value.statuses[0]);

    try {
        const _entry = body?.entry?.[0];
        const _changes = _entry?.changes?.[0];
        const _value = _changes?.value;
        const _messageObject = _value?.messages;

        if (Array.isArray(_messageObject)) {
            let _messages = _messageObject[0];
            // FUNCION DONDE REALIZAMOS EL PROCEDIMIENTO PARA ENVIAR LA RESPUESTA
            let _model = await process_response(_messages);

            // ENVIAMOS EL MODELO DE DATO
            if (Object.keys(_model).length > 0) {
                console.log('Enviando mensaje:', _model);
                await send_message(_model);
            } else {
                console.log('No hay mensaje para enviar.');
            }
        }

        response.sendStatus(200);
    } catch (error) {
        response.sendStatus(400);
    }
}



const send_notification = (request, response) => {
    try {
        const body = request.body;
        // console.log('send_notification: ', body);
        let _model = {};

        if (!body.type?.trim() || !body.phone_number?.trim()) {
            return response.status(400).json({
                next: false,
                message: 'Los campos obligatorios son los siguientes y no deben de estar vacios: type, phone_number.'
            });
        }

        switch (body.type) {
            case "document":
                if (!body.url?.trim()) {
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
                // CREANDO CONFIGURACION
                let _config = {
                    number: body.phone_number,
                    name: body.name,
                    language_code: 'es',
                    url: body?.url || null,
                    filename: body?.filename || null,
                    caption: body?.caption || null
                };

                if (!body.name?.trim()) {
                    return response.status(400).json({
                        next: false,
                        message: 'El campo name es obligatorio y no debe de estar vacio.'
                    });
                }

                // CONDICIONES PARA SABER QUE PLANTILLA ES
                switch (body.name) {
                    case 'ordenservicio':
                    case 'notify_autorizacion_personal':
                        if (!Array.isArray(body.components) || body.components.length === 0) {
                            return response.status(400).json({
                                next: false,
                                message: 'El campo components es obligatorio y debe ser un arreglo con al menos un elemento.'
                            });
                        }
                        break;
                }

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
                if (!body.message?.trim()) {
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