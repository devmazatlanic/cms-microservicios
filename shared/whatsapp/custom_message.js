const { template } = require("handlebars");

const message_text = (_data = { number: "",  message: ""}) => {
    const _model = JSON.stringify({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "type": "text",
        "to": _data.number,
        "text": {
            "body": _data.message
        }
    });

    return _model;
}

const message_image = (_data = { number: "", url: ""}) => {
    const _model = JSON.stringify({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "type": "image",
        "to": _data.number,
        "image": {
            "link": _data.url
        }
    });

    return _model;
}

const message_audio = (_data = { number: "", url: ""}) => {
    const _model = JSON.stringify({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "type": "audio",
        "to": _data.number,
        "audio": {
            "link": _data.url
        }
    });

    return _model;
}

const message_video = (_data = { number: "", url: ""}) => {
    const _model = JSON.stringify({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "type": "video",
        "to": _data.number,
        "video": {
            "link": _data.url
        }
    });

    return _model;
}

const message_document = (_data = { number: "", url: ""}) => {
    let _config = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "type": "document",
        "to": _data.number,
        "document": {
            "link": _data.url
        }
    };
    
    const _model = JSON.stringify(_config);

    return _model;
}

const message_location = (_data = { number: "", url: ""}) => {
    const _model = JSON.stringify({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "type": "location",
        "to": _data.number,
        "location": {
            "latitude": _data.latitude,
            "longitude": _data.longitude,
            "name":_data.name,
            "address": _data.address
        }
    });

    return _model;
}

const message_templete = (_data = { number: "", name: "", language_code:  "", components: []}) => {
    let _config = {
        messaging_product: "whatsapp",
        to: _data.number,
        type: "template",
        template: {
            name: _data.name,
            language: {
                code: _data.language_code
            }
        }
    };

    // Si se mandan componentes (body, header, footer, etc.)
    if (_data.components && _data.components.length > 0) {
        _config.template.components = _data.components;
    }

    const _model = JSON.stringify(_config);

    return _model;
}

module.exports = {
    message_text,
    message_image,
    message_audio,
    message_video,
    message_document,
    message_location,
    message_templete
}