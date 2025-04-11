const { request, response } = require('express');
// const { getPerfiles } = require('../models/perfiles');


const verify_token = async (request, response) => {
    try {
        let accessToken = "KAJSDHASKJDHKASJDHKAJSDHJKASDJK123102938129038190238";
        let token = request.query["hub.verify_token"];
        let challenge = request.query["hub.challenge"];

        if (challenge != null && token != null && accessToken == token) {
            response.json({
                message: 'GET API - CONTROLLER wasdasd',
                challenge: challenge
            });
        } else {
            response.status(400).send();
        }
    } catch (error) {
        console.error('ERROR AL OBTENER LOS PERFILES: ', error);
        response.status(400).json({ error: 'ERROR AL VERIFICAR TOKEN.' });
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