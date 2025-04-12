const { request, response } = require('express');
const { send_message } = require('../helpers/whatsapp');
const { message_text, message_document } = require("../shared/whatsapp/custom_message");
// const { getPerfiles } = require('../models/perfiles');


const verify_token = async (request, response) => {
    try {
        const VERIFY_TOKEN = "KAJSDHASKJDHKASJDHKAJSDHJKASDJK123102938129038190238";
        const mode = request.query['hub.mode'];
        const token = request.query['hub.verify_token'];
        const challenge = request.query['hub.challenge'];

        if (mode && token === VERIFY_TOKEN) {
            console.log('WEBHOOK VERIFICADO POR META.');
            response.status(200).json({
                message: challenge
            });
        } else {
            console.warn('FALLO LA VERIFICACION DEL WEBHOOK.');
            response.sendStatus(403);
        }
    } catch (error) {
        console.error('ERROR AL OBTENER LOS PERFILES: ', error);
        response.sendStatus(400).send();
    }
};

const received_message = (request, response) => {
    const body = request.body;

    response.json({
        message: 'POST API - CONTROLLER',
        body
    });
}

const send_notification = (request, response) => {
    try {
        const body = request.body;
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