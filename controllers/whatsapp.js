const { request, response } = require('express');
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


module.exports = {
    verify_token,
    received_message
}