const https = require("https");

const send_message = (_model) => {

    const _options = {
        host: "graph.facebook.com",
        path: "/v22.0/634731639721148/messages",
        method: "POST",
        body: _model,
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer EAAOYc8XIEcIBOzKBsiheJky5YGwzFq75aCWMOEsyyrZCjNiZA2ZBTl8ZB2pKYuXeGjNDYGZAQC5J1xZCOZAwr66h0z3ngmj3OZB6VIwCXpTVey5CXUNE0f9tBSs9h1qWqX5Ge6ZCHydfCetrj5zZCxBdfIjPZAuZA08WqXVZAdUq8JroiPjD3s7ZC4tS1M6dR1N1dna7rC9wZDZD"
        }
    };

    const request = https.request(_options, response => {
        response.on("data", d => {
            process.stdout.write(d);
        })
    });

    request.on("error", error => {
        console.error(error);
    });

    request.write(_model);
    request.end();
}


module.exports = {
    send_message
}