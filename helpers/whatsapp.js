const http = require("https");

const send_message = (_model) => {
    // const _payload = JSON.stringify(_model);
    const _payload = _model;

    const _options = {
        host: "graph.facebook.com",
        path: "/v22.0/654524481067952/messages",
        method: "POST",
        port:     443,
        // body: _payload,
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer EAAOYc8XIEcIBO84xzupaaWNtvDdqUNTw8y785guUMATn1LuQEeaqMaEXzuizYLUotZB1LHCIhgdVRu7hMZBbMGJLpkkdvkKaZCrVTCg3OcWjchFNz8c1uleUpxLKLm1ZCZCbzGpZCy0H6Yxnz15J94OlBIeDdj9fhecKlFZAQLXQQBWhLXlZAI2vRuhEiHfFZCVa8swZDZD",
            'Content-Length': Buffer.byteLength(_payload)
        }
    };

    const request = http.request(_options, response => {
        let data = '';
        // Opcional: loguea el status
        console.log('Status code:', response.statusCode);

        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
            console.log('Respuesta WhatsApp:', data);
            // ESTA RESPUESTA ES LA QUE ALMACENAREMOS EN BASE DE DATOS
        });
    });

    request.on("error", error => {
        console.error("Error al enviar mensaje:", error);
    });

    request.write(_payload);
    request.end();
}


module.exports = {
    send_message
}