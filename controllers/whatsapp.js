const { request, response } = require('express');
const { send_message } = require('../helpers/whatsapp');
const { message_text, message_document, message_templete } = require("../shared/whatsapp/custom_message");
const { buildComponent, process_response } = require("../helpers/tools");
const { update_message_status } = require('../models/whatsapp');

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const SUPPORTED_NOTIFICATION_TYPES = ['text', 'document', 'template'];

const normalizeTextValue = (value) => {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value).trim();
};

const normalizeTextArray = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => normalizeTextValue(item))
        .filter((item) => item.length > 0);
};

const normalizeSendNotificationBody = (body) => {
    const safeBody = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

    return {
        type: normalizeTextValue(safeBody.type).toLowerCase(),
        phone_number: normalizeTextValue(safeBody.phone_number),
        message: normalizeTextValue(safeBody.message),
        name: normalizeTextValue(safeBody.name),
        url: normalizeTextValue(safeBody.url),
        link: normalizeTextValue(safeBody.link),
        filename: normalizeTextValue(safeBody.filename),
        caption: normalizeTextValue(safeBody.caption),
        headers: normalizeTextArray(safeBody.headers),
        components: normalizeTextArray(safeBody.components)
    };
};

const syncWhatsappStatuses = async (statuses = []) => {
    for (const status of statuses) {
        const id_message = typeof status?.id === 'string' ? status.id.trim() : '';
        const message_status = typeof status?.status === 'string' ? status.status.trim() : '';

        if (!id_message || !message_status) {
            console.log('Webhook WhatsApp status incompleto:', {
                id: status?.id || null,
                status: status?.status || null
            });
            continue;
        }

        const result = await update_message_status({ id_message, message_status });

        if (result?.affectedRows > 0) {
            console.log(`Bitacora WhatsApp actualizada: ${id_message} -> ${message_status}`);
        } else {
            console.log(`No se encontro bitacora para status de WhatsApp: ${id_message}`);
        }
    }
};

const processWhatsappMessage = async (message) => {
    const _model = await process_response(message);

    if (Object.keys(_model).length > 0) {
        console.log('Enviando mensaje:', _model);
        await send_message(_model);
    } else {
        console.log('No hay mensaje para enviar.');
    }
};

const processWhatsappChange = async (change) => {
    const _value = change?.value || {};
    const _statuses = Array.isArray(_value.statuses) ? _value.statuses : [];
    const _messages = Array.isArray(_value.messages) ? _value.messages : [];
    let _processed = false;

    if (_statuses.length > 0) {
        console.log('Webhook WhatsApp statuses:', _statuses.map((status) => ({
            id: status?.id || null,
            status: status?.status || null,
            recipient_id: status?.recipient_id || null
        })));
        await syncWhatsappStatuses(_statuses);
        _processed = true;
    }

    if (_messages.length > 0) {
        console.log('Webhook WhatsApp messages recibidos:', _messages.length);

        for (const _message of _messages) {
            await processWhatsappMessage(_message);
        }

        _processed = true;
    }

    if (!_processed) {
        console.log('Webhook WhatsApp sin messages ni statuses procesables:', Object.keys(_value));
    }
};

const verify_token = (request, response) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    if (!WHATSAPP_VERIFY_TOKEN) {
        return response.status(500).json({
            next: false,
            message: 'La configuracion de WhatsApp no esta completa.'
        });
    }

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        return response.status(200).send(challenge); // texto plano, no JSON
    } else {
        return response.sendStatus(403);
    }
};

const received_message = async (request, response) => {
    const body = request.body;

    try {
        const _entries = Array.isArray(body?.entry) ? body.entry : [];

        if (_entries.length === 0) {
            console.log('Webhook WhatsApp sin entry procesables.');
            return response.sendStatus(200);
        }

        for (const _entry of _entries) {
            const _changes = Array.isArray(_entry?.changes) ? _entry.changes : [];

            if (_changes.length === 0) {
                console.log('Webhook WhatsApp entry sin changes procesables.');
                continue;
            }

            for (const _change of _changes) {
                await processWhatsappChange(_change);
            }
        }

        response.sendStatus(200);
    } catch (error) {
        console.error('Error al procesar webhook de WhatsApp:', error);
        response.sendStatus(400);
    }
}
const send_notification = async (request, response) => {
    try {
        const body = normalizeSendNotificationBody(request.body);
        // console.log('send_notification: ', body);
        let _model = {};

        if (!body.type || !body.phone_number) {
            return response.status(400).json({
                next: false,
                message: 'Los campos obligatorios son los siguientes y no deben de estar vacios: type, phone_number.'
            });
        }

        if (!SUPPORTED_NOTIFICATION_TYPES.includes(body.type)) {
            return response.status(400).json({
                next: false,
                message: `El campo type es invalido. Valores permitidos: ${SUPPORTED_NOTIFICATION_TYPES.join(', ')}.`
            });
        }

        switch (body.type) {
            case "document":
                if (!body.url) {
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
                    url: body.url || null,
                    filename: body.filename || null,
                    caption: body.caption || null
                };

                if (!body.name) {
                    return response.status(400).json({
                        next: false,
                        message: 'El campo name es obligatorio y no debe de estar vacio.'
                    });
                }

                // CONDICIONES PARA SABER QUE PLANTILLA ES
                switch (body.name) {
                    case 'notify_solicitud_personal':
                    case 'notify_solicitud_personal_seguridad':
                    case 'ordenservicio_reenvio':
                    case 'notify_cierre_evento':
                        if (body.components.length === 0) {
                            return response.status(400).json({
                                next: false,
                                message: 'El campo components es obligatorio y debe ser un arreglo con al menos un elemento.'
                            });
                        }
                        break;
                    case 'notify_solicitud_autorizacion':
                        if (body.components.length < 2) {
                            return response.status(400).json({
                                next: false,
                                message: 'El campo components es obligatorio y debe incluir al menos 2 parametros (nombre y detalle/codigo).'
                            });
                        }
                        break;
                    case 'notify_asignaciones_personal':
                        const faltaComponents = body.components.length === 0;
                        const faltaHeaders = body.headers.length === 0;

                        if (faltaComponents || faltaHeaders) {
                            return response.status(400).json({
                                next: false,
                                message: 'El campo components y headers es obligatorio y debe ser un arreglo con al menos un elemento.'
                            });
                        }
                        break;
                    case 'notify_autorizacion_personal':
                    case 'notify_ordenservicio':
                    case 'notify_bitacora_ordenservicio':
                        if ((body.components.length === 0) || (!body.link)) {
                            return response.status(400).json({
                                next: false,
                                message: 'El campo components y link es obligatorio y debe ser un arreglo con al menos un elemento.'
                            });
                        }
                        break;
                    case 'notify_solicitud_factura_personalvariable':
                        if ((body.components.length === 0) || (!body.url)) {
                            return response.status(400).json({
                                next: false,
                                message: 'El campo components y url es obligatorio y debe ser un arreglo con al menos un elemento.'
                            });
                        }
                        break;
                }

                _config.components = [];
                if (body.headers.length > 0) {
                    _config.components.push(buildComponent("header", body.headers));
                }

                if (body.components.length > 0) {
                    _config.components.push(buildComponent("body", body.components));
                }

                switch (body.name) {
                    case 'notify_autorizacion_personal':
                    case 'notify_ordenservicio':
                    case 'notify_bitacora_ordenservicio':
                        if (body.link.length > 0) {
                            _config.components.push({
                                type: 'button',
                                sub_type: 'url',
                                index: 0,
                                parameters: [
                                    {
                                        type: 'text',
                                        text: body.link
                                    }
                                ]
                            });
                        }
                        break;
                    case 'notify_solicitud_factura_personalvariable':
                        if (body.filename && body.url.length > 0) {
                            _config.components.push({
                                type: 'button',
                                sub_type: 'url',
                                index: 0,
                                parameters: [
                                    {
                                        type: 'text',
                                        text: body.url
                                    }
                                ]
                            });
                        }
                        break;
                }

                _model = message_templete(_config);
                break;

            case 'text':
                if (!body.message) {
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
        const sendResult = await send_message(_model);

        response.status(200).json({
            next: true,
            message: 'Su mensaje fue enviado con exito.',
            meta_status_code: sendResult.statusCode,
            meta_response: sendResult.metaResponse,
            stored_request_id: sendResult.storedRequest?.insertId || null,
            storage_error: sendResult.storageError
        });
    } catch (error) {
        console.error(error);
        const responseStatus = error.statusCode >= 400 ? error.statusCode : 500;

        response.status(responseStatus).json({
            next: false,
            message: 'Hubo un error al ejecutar la aplicacion para enviar mensaje por whatsapp.',
            meta_status_code: error.statusCode || null,
            meta_response: error.metaResponse || null,
            stored_request_id: error.storedRequest?.insertId || null,
            storage_error: error.storageError || null
        });
    }
}


module.exports = {
    verify_token,
    received_message,
    send_notification
}
