const macaddress = require('macaddress');
const { get_message, store_incoming_message } = require('../models/whatsapp');
const { message_text, message_document } = require("../shared/whatsapp/custom_message");

const get_mac_address = async () => {
    try {
        const mac = await new Promise((resolve, reject) => {
            macaddress.one((err, mac) => {
                if (err) {
                    reject(new Error(`No se pudo obtener la mac address: ${err.message}`));
                } else {
                    resolve(mac);
                }
            });
        });

        return mac;
    } catch (error) {
        throw new Error(`Error al obtener la MAC Address: ${error.message}`);
    }
};

// ---------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------
// FUNCIONES WHATSAPP
const buildComponent = (type = "body", texts = []) => {
    return {
        type,
        parameters: texts.map(text => ({
            type: "text",
            text
        }))
    };
};

const normalizeIncomingText = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
};

const buildIncomingAuditModel = ({ message, text, context_id, context_status, context_row }) => {
    return {
        ...message,
        _audit: {
            text,
            context_id: context_id || null,
            context_status,
            matched_request_id: context_row?.id || null,
            matched_type: context_row?.type || null,
            matched_name: context_row?.name || null
        }
    };
};

const BOT_MENU_NAME = 'bot_menu';
const BOT_STATUS_NAME = 'bot_status';
const BOT_CONTEXT_NAMES = new Set([BOT_MENU_NAME, BOT_STATUS_NAME]);
const BOT_MENU_COMMANDS = new Set(['MENU', 'AYUDA', 'INICIO', 'HELP']);
const BOT_STATUS_COMMANDS = new Set(['ESTADO', 'STATUS']);

const getBotMenuText = () => {
    return [
        'Hola. Este canal procesa notificaciones enviadas por el sistema y respuestas sobre mensajes previos.',
        '',
        'Opciones disponibles:',
        '1. Responde directamente a una notificacion para continuar ese flujo.',
        '2. Escribe MENU para volver a ver esta ayuda.',
        '3. Escribe ESTADO para confirmar que el canal esta activo.'
    ].join('\n');
};

const getBotStatusText = () => {
    return [
        'El canal de WhatsApp esta activo.',
        'Si necesitas continuar un flujo del sistema, responde directamente a la notificacion correspondiente o escribe MENU para ver la ayuda disponible.'
    ].join('\n');
};

const buildManagedTextResponse = ({ number, message, name }) => {
    return {
        payload: message_text({
            number,
            message
        }),
        storeMeta: {
            type: 'text',
            name,
            model: {
                internal_name: name
            }
        }
    };
};

const buildBotMenuResponse = (number) => {
    console.log('Bot WhatsApp: enviando menu inicial.');
    return buildManagedTextResponse({
        number,
        message: getBotMenuText(),
        name: BOT_MENU_NAME
    });
};

const buildBotStatusResponse = (number) => {
    console.log('Bot WhatsApp: enviando confirmacion de estado.');
    return buildManagedTextResponse({
        number,
        message: getBotStatusText(),
        name: BOT_STATUS_NAME
    });
};

const buildBotFallbackResponse = (number) => {
    console.log('Bot WhatsApp: comando no reconocido, reenviando menu.');
    return buildManagedTextResponse({
        number,
        message: [
            'No reconoci la opcion enviada.',
            '',
            getBotMenuText()
        ].join('\n'),
        name: BOT_MENU_NAME
    });
};

const resolveBotResponse = ({ text, number, preferMenuOnUnknown = false }) => {
    const normalizedCommand = normalizeIncomingText(text).toUpperCase();

    if (!normalizedCommand || BOT_MENU_COMMANDS.has(normalizedCommand)) {
        return buildBotMenuResponse(number);
    }

    if (BOT_STATUS_COMMANDS.has(normalizedCommand)) {
        return buildBotStatusResponse(number);
    }

    if (preferMenuOnUnknown) {
        return buildBotMenuResponse(number);
    }

    return buildBotFallbackResponse(number);
};

const process_response = async (_message) => {
    let _text = normalizeIncomingText(GetTextUser(_message));
    let _from = _message.from;
    let _id_context = _message.context?.id;
    let _model = {};
    let _type = '';
    let _name = '';
    let _url = '';
    let _filename = '';
    let _caption = '';
    // console.log("Mensaje recibido de Meta:", body.entry[0].changes[0].value.messages[0]);

    if (!_id_context) {
        console.log('Bot WhatsApp: mensaje sin context.id, se almacenara y se evaluara menu.');
        await storeIncomingForBot({
            message: _message,
            phone_number: _from,
            message_status: 'incoming_no_context',
            message_name: 'incoming_message_without_context',
            context_id: null,
            extracted_text: _text
        });
        return resolveBotResponse({
            text: _text,
            number: _from,
            preferMenuOnUnknown: true
        });
    }

    // VALIDAMOS EL TIPO DE RESPUESTA Y PARA ESO, BUSCAMOS QUE EL ID CONTEXT EXISTA EN LA BASE DE DATOS: WHATSAPP_REQUETS
    if (_id_context) {
        const _result = await get_message(_id_context);
        console.log('📦 Contexto obtenido:', _result[0]);

        if (_result.length === 0) {
            console.log('No se encontró contexto');
            await storeIncomingForBot({
                message: _message,
                phone_number: _from,
                message_status: 'incoming_context_not_found',
                message_name: 'incoming_message_with_unknown_context',
                context_id: _id_context,
                extracted_text: _text
            });
            return buildManagedTextResponse({
                number: _from,
                message: [
                    'No pude asociar tu respuesta con una notificacion vigente.',
                    '',
                    getBotMenuText()
                ].join('\n'),
                name: BOT_MENU_NAME
            });
        }

        const _row = _result[0];
        _type = _row?.type || '';
        _name = _row?.name || '';
        _url = _row?.url || null;
        _filename = _row?.filename || null;
        _caption = _row?.caption || null;

        await storeIncomingForBot({
            message: _message,
            phone_number: _from,
            message_status: 'incoming_context_resolved',
            message_name: 'incoming_message_with_context',
            context_id: _id_context,
            context_row: _row,
            extracted_text: _text
        });
    }

    // REVISAMOS QUE TIPO DE MENSAJE ES
    switch (_type) {
        case 'template':
            // AHORA VALIDAMOS EL NOMBRE DE LA PLANTILLA QUE SE ESTA UTILIZANDO
            switch (_name) {
                case 'ordenservicio_reenvio':
                    // LA PLANTILLA CUENTA CON BOTONES: SI
                    switch (_text.toUpperCase()) {
                        case 'SI':
                            // CREAMOS EL MODELO DE DATO
                            _model = message_document({
                                number: _from,
                                url: _url,
                                filename: _filename,
                                caption: _caption
                            });
                            break;

                        default:
                            _model = message_text({
                                number: _from,
                                message: 'Lo sentimos, no existe un resultado para esta solicitud.'
                            });
                            break;
                    }
                    break;

                default:
                    console.log('Template no controlado:', _name);
                    break;
            }
            break;

        case 'text':
            if (BOT_CONTEXT_NAMES.has(_name)) {
                console.log(`Bot WhatsApp: mensaje asociado al contexto ${_name}.`);
                _model = resolveBotResponse({
                    text: _text,
                    number: _from
                });
                break;
            }

        default:
            console.log('Tipo no controlado:', _type);
            break;
    }

    return _model;
}

const storeIncomingForBot = async ({
    message,
    phone_number,
    message_status,
    message_name = 'incoming_message',
    context_id = null,
    context_row = null,
    extracted_text = ''
}) => {
    try {
        await store_incoming_message({
            phone_number,
            type: message?.type || 'incoming',
            name: message_name,
            id_message: message?.id || null,
            message_status,
            model: buildIncomingAuditModel({
                message,
                text: extracted_text,
                context_id,
                context_status: message_status,
                context_row
            })
        });
    } catch (error) {
        console.error('No se pudo almacenar mensaje entrante de WhatsApp:', error.message);
    }
};

const GetTextUser = (_message) => {
    let _text = '';
    let _typeMessage = _message['type'];

    switch (_typeMessage) {
        case 'text':
            _text = _message['text']['body'];
            break;

        case 'button':
            _text = _message['button'].text;
            break;

        case 'interactive':
            let _interactiveObject = _message['interactive'];
            let _interactiveType = _interactiveObject['type'];

            switch (_interactiveType) {
                case 'button_reply':
                    _text = _interactiveObject['button_reply']['title'];
                    break;

                case 'list_reply':
                    _text = _interactiveObject['list_reply']['title'];
                    break;

                default:
                    console.log('_interactiveObject: ', _interactiveObject);
                    break;
            }
            break;

        default:
            console.log('_message: ', _message);
            break;
    }

    return normalizeIncomingText(_text);
}

// ---------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------

module.exports = {
    get_mac_address,
    buildComponent,
    process_response
}
