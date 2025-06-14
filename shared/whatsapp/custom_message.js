const { template } = require("handlebars");

const message_text = (_data = { number: "", message: "" }) => {
    let _config = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "type": "text",
        "to": _data.number,
        "text": {
            "body": _data.message
        }
    };

    const _model = JSON.stringify(_config);

    return _model;
}

const message_image = (_data = { number: "", url: "" }) => {
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

const message_audio = (_data = { number: "", url: "" }) => {
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

const message_video = (_data = { number: "", url: "" }) => {
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

const message_document = (_data = { number: "", url: "", filename: "", caption: "" }) => {
    let _config = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "type": "document",
        "to": _data.number,
        "document": {
            "link": _data.url,
            "filename": _data.filename,
            "caption": _data.caption
        }
    };

    const _model = JSON.stringify(_config);

    return _model;
}

const message_location = (_data = { number: "", url: "" }) => {
    const _model = JSON.stringify({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "type": "location",
        "to": _data.number,
        "location": {
            "latitude": _data.latitude,
            "longitude": _data.longitude,
            "name": _data.name,
            "address": _data.address
        }
    });

    return _model;
}

const message_templete = (_data = { number: "", name: "", language_code: "", components: [], url: "", filename: "", caption: "" }) => {
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

    if (_data.components && _data.components.length > 0) {
        _config.template.components = _data.components;
    }

    if (_data.url && _data.url.length > 0) {
        _config.url = _data.url;
    }

    if (_data.filename && _data.filename.length > 0) {
        _config.filename = _data.filename;
    }

    if (_data.caption && _data.caption.length > 0) {
        _config.caption = _data.caption;
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