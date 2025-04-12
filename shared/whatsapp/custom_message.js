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
    const _model = JSON.stringify({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "type": "document",
        "to": _data.number,
        "document": {
            "link": _data.url
        }
    });

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

module.exports = {
    message_text,
    message_image,
    message_audio,
    message_video,
    message_document,
    message_location
}