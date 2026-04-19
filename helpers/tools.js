const macaddress = require('macaddress');
const {
    get_message,
    store_incoming_message,
    update_message_status,
    clear_pending_auth_request,
    get_pending_auth_request
} = require('../models/whatsapp');
const { message_text, message_document } = require("../shared/whatsapp/custom_message");
const { submitAuthRequestApproverDecision } = require('../models/auth_requests');

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

const AUTH_REQUEST_TEMPLATE_NAME = 'notify_solicitud_autorizacion';
const AUTH_REQUEST_PENDING_NAME = 'auth_request_pending';
const AUTH_REQUEST_PENDING_STATUS = 'awaiting_reason';
const AUTH_REQUEST_PENDING_TTL_MS = 60 * 60 * 1000; // 60 minutos

const safeJsonParse = (value) => {
    if (typeof value !== 'string') {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch (_error) {
        return null;
    }
};

const stripDiacritics = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const normalizeDetailKey = (value) => {
    return stripDiacritics(value)
        .toLowerCase()
        .replace(/\s+/g, '')
        .trim();
};

const parseAuthorizationDetails = (value) => {
    const details = {};
    const normalizedValue = normalizeIncomingText(value);

    if (!normalizedValue) {
        return details;
    }

    normalizedValue
        .split('|')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .forEach((part) => {
            const separatorIndex = part.indexOf(':');
            if (separatorIndex === -1) {
                return;
            }

            const rawKey = part.slice(0, separatorIndex).trim();
            const rawValue = part.slice(separatorIndex + 1).trim();
            const key = normalizeDetailKey(rawKey);

            if (!key) {
                return;
            }

            details[key] = rawValue;
        });

    return details;
};

const extractTemplateBodyTexts = (payload) => {
    const texts = [];
    const bodyComponents = payload?.template?.components;

    if (!Array.isArray(bodyComponents)) {
        return texts;
    }

    for (const component of bodyComponents) {
        if (component?.type !== 'body' || !Array.isArray(component?.parameters)) {
            continue;
        }

        for (const parameter of component.parameters) {
            if (parameter?.type === 'text' && typeof parameter?.text === 'string') {
                const normalized = normalizeIncomingText(parameter.text);
                if (normalized) {
                    texts.push(normalized);
                }
            }
        }

        if (texts.length > 0) {
            break;
        }
    }

    return texts;
};

const resolveAuthDecisionFromText = (value) => {
    const normalized = normalizeIncomingText(value).toUpperCase();

    if (!normalized) {
        return null;
    }

    if (['AUTORIZAR', 'AUTORIZADO', 'APROBAR', 'APROBADO', 'ACEPTAR', 'ACEPTADO'].includes(normalized)) {
        return { decision: 'approve', estado: 1, label: 'AUTORIZAR' };
    }

    if (['RECHAZAR', 'RECHAZADO', 'DENEGAR', 'DENEGADO'].includes(normalized)) {
        return { decision: 'reject', estado: -1, label: 'RECHAZAR' };
    }

    return null;
};

const parseNumericIdentifier = (value) => {
    const cleaned = normalizeIncomingText(value);

    if (!cleaned) {
        return null;
    }

    if (/[a-z]/i.test(cleaned)) {
        return null;
    }

    const digits = cleaned.replace(/\D/g, '');
    if (!digits) {
        return null;
    }

    const id = Number(digits);
    return Number.isFinite(id) ? id : null;
};

const parseAuthRequestIdentifiers = (details = {}) => {
    const rawValue = details.codigo
        || details.codigosolicitud
        || details.idauthrequest
        || details.idauth
        || details.idsolicitud
        || details.solicitud
        || '';

    const cleaned = normalizeIncomingText(rawValue);

    if (!cleaned) {
        return { id_auth_request: null, id_usuario: null };
    }

    const parts = cleaned
        .split(/[-–—]/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

    const id_auth_request = parseNumericIdentifier(parts[0] || cleaned);
    const id_usuario = parts.length > 1 ? parseNumericIdentifier(parts[1]) : null;

    return { id_auth_request, id_usuario };
};

const buildAuthReasonPrompt = ({ decisionLabel, idAuthRequest, details }) => {
    const folio = details?.folio || details?.folioprincipal || '';
    const modulo = details?.modulo || details?.tabla || '';
    const accion = details?.accion || '';

    const parts = [];

    parts.push(`Seleccionaste: ${decisionLabel}.`);

    if (Number.isFinite(idAuthRequest)) {
        parts.push(`Solicitud: ${idAuthRequest}.`);
    }

    const contextParts = [];
    if (folio) contextParts.push(`Folio ${folio}`);
    if (modulo) contextParts.push(`Modulo ${modulo}`);
    if (accion) contextParts.push(`Accion ${accion}`);
    if (contextParts.length > 0) {
        parts.push(contextParts.join(' | ') + '.');
    }

    parts.push('Escribe el motivo de tu decision (o CANCELAR para salir):');

    return parts.join('\n');
};

const buildAuthSubmitErrorMeta = (error) => {
    if (!error || typeof error !== 'object') {
        return {
            message: String(error || 'unknown error'),
            code: null,
            errno: null,
            sql_state: null,
            sql_message: null
        };
    }

    return {
        message: String(error.message || 'unknown error'),
        code: typeof error.code === 'string' ? error.code : null,
        errno: Number.isFinite(error.errno) ? error.errno : null,
        sql_state: typeof error.sqlState === 'string' ? error.sqlState : null,
        sql_message: typeof error.sqlMessage === 'string' ? error.sqlMessage : null
    };
};

const resolveAuthSubmitErrorMessage = ({ error, idAuthRequest }) => {
    const code = typeof error?.code === 'string' ? error.code : '';

    if (code === 'AUTH_REQUEST_NOT_FOUND') {
        return `No existe la solicitud ${idAuthRequest}. Verifica el codigo e intenta de nuevo.`;
    }

    if (code === 'AUTH_REQUEST_INVALID') {
        return 'El codigo de solicitud no es valido. Contacta a TI para revisar la notificacion.';
    }

    if (code === 'AUTH_USER_INVALID') {
        return 'El codigo de usuario no es valido. Contacta a TI para revisar la notificacion.';
    }

    if (code === 'AUTH_DECISION_INVALID') {
        return 'La decision enviada no es valida. Intenta de nuevo desde los botones Autorizar/Rechazar.';
    }

    if (code === 'ER_NO_SUCH_TABLE') {
        const rawMessage = String(error?.sqlMessage || error?.message || '');

        if (rawMessage.includes('tcr_auth_request_approvers')) {
            return 'No existe la tabla tcr_auth_request_approvers en la base de datos. Contacta a TI.';
        }

        return 'No se encontro una tabla requerida para registrar la autorizacion. Contacta a TI.';
    }

    if (['ER_TABLEACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR', 'ER_ACCESS_DENIED_ERROR'].includes(code)) {
        return 'El servicio no tiene permisos para registrar aprobaciones. Contacta a TI.';
    }

    if (['ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2'].includes(code)) {
        return 'No pude registrar la respuesta porque la solicitud o el usuario no existen en la base de datos. Contacta a TI.';
    }

    return 'No pude registrar tu respuesta en este momento. Intenta de nuevo o contacta a TI.';
};

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

const buildManagedTextResponse = ({ number, message, name, model = null }) => {
    return {
        payload: message_text({
            number,
            message
        }),
        storeMeta: {
            type: 'text',
            name,
            model: {
                internal_name: name,
                ...(model && typeof model === 'object' ? model : {})
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

const handleAuthReasonIfPending = async ({ message, phone_number, text }) => {
    if (message?.type !== 'text') {
        return null;
    }

    const pendingRows = await get_pending_auth_request({ phone_number });
    if (!Array.isArray(pendingRows) || pendingRows.length === 0) {
        return null;
    }

    const pendingRow = pendingRows[0];
    const pendingPayload = safeJsonParse(pendingRow?.model) || {};

    if (pendingPayload?.flow !== 'auth_request' || pendingRow?.name !== AUTH_REQUEST_PENDING_NAME) {
        return null;
    }

    const initiatedAt = typeof pendingPayload?.initiated_at === 'string' ? Date.parse(pendingPayload.initiated_at) : NaN;
    const isExpired = Number.isFinite(initiatedAt)
        ? Date.now() - initiatedAt > AUTH_REQUEST_PENDING_TTL_MS
        : false;

    if (isExpired) {
        try {
            await update_message_status({
                id_message: pendingRow?.id_message || null,
                message_status: 'expired'
            });
        } catch (error) {
            console.error('No se pudo marcar flujo expirado:', error.message);
        }

        return buildManagedTextResponse({
            number: phone_number,
            name: 'auth_request_expired',
            message: 'La solicitud expiro. Vuelve a seleccionar Autorizar/Rechazar desde la notificacion original.',
            model: {
                flow: 'auth_request',
                event: 'expired',
                id_auth_request: pendingPayload?.id_auth_request || null
            }
        });
    }

    const idAuthRequest = Number(pendingPayload?.id_auth_request);
    const estado = Number(pendingPayload?.estado);
    const idUsuario = Number(pendingPayload?.id_usuario);
    const decisionLabel = pendingPayload?.decision_label || null;

    if (!Number.isFinite(idAuthRequest) || !Number.isFinite(estado) || !Number.isFinite(idUsuario)) {
        return buildManagedTextResponse({
            number: phone_number,
            name: 'auth_request_invalid_pending',
            message: 'No pude procesar esta solicitud de autorizacion. Contacta a TI para revisar la configuracion.',
            model: {
                flow: 'auth_request',
                event: 'invalid_pending',
                pending: pendingPayload
            }
        });
    }

    const reasonText = normalizeIncomingText(text);
    if (!reasonText) {
        return buildManagedTextResponse({
            number: phone_number,
            name: 'auth_request_reason_required',
            message: 'Necesito que escribas el motivo para continuar con la solicitud.',
            model: {
                flow: 'auth_request',
                event: 'reason_required',
                id_auth_request: idAuthRequest
            }
        });
    }

    const normalizedReasonCommand = reasonText.toUpperCase();
    if (normalizedReasonCommand === 'CANCELAR') {
        try {
            await update_message_status({
                id_message: pendingRow?.id_message || null,
                message_status: 'cancelled'
            });
        } catch (error) {
            console.error('No se pudo cancelar flujo pendiente:', error.message);
        }

        return buildManagedTextResponse({
            number: phone_number,
            name: 'auth_request_cancelled',
            message: 'Solicitud cancelada. Si necesitas responder, vuelve a seleccionar Autorizar/Rechazar desde la notificacion original.',
            model: {
                flow: 'auth_request',
                event: 'cancelled',
                id_auth_request: idAuthRequest
            }
        });
    }

    if (BOT_MENU_COMMANDS.has(normalizedReasonCommand) || BOT_STATUS_COMMANDS.has(normalizedReasonCommand)) {
        return buildManagedTextResponse({
            number: phone_number,
            name: 'auth_request_reason_pending',
            message: 'Tienes una solicitud de autorizacion pendiente. Escribe el motivo para continuar o escribe CANCELAR para salir.',
            model: {
                flow: 'auth_request',
                event: 'reason_pending',
                id_auth_request: idAuthRequest
            }
        });
    }

    try {
        const submitResult = await submitAuthRequestApproverDecision({
            id_auth_request: idAuthRequest,
            id_usuario: idUsuario,
            comentario: reasonText,
            estado
        });

        try {
            await update_message_status({
                id_message: pendingRow?.id_message || null,
                message_status: 'completed'
            });
        } catch (error) {
            console.error('No se pudo cerrar flujo pendiente:', error.message);
        }

        if (submitResult?.action === 'already_decided') {
            return buildManagedTextResponse({
                number: phone_number,
                name: 'auth_request_already_decided',
                message: 'Ya existe una respuesta registrada para esta solicitud.',
                model: {
                    flow: 'auth_request',
                    event: 'already_decided',
                    id_auth_request: idAuthRequest,
                    estado_registrado: submitResult?.existing_estado ?? null
                }
            });
        }

        return buildManagedTextResponse({
            number: phone_number,
            name: 'auth_request_completed',
            message: 'Listo. Tu respuesta fue registrada. Gracias.',
            model: {
                flow: 'auth_request',
                event: 'completed',
                id_auth_request: idAuthRequest,
                estado,
                decision_label: decisionLabel,
                result: submitResult
            }
        });
    } catch (error) {
        const errorMeta = buildAuthSubmitErrorMeta(error);
        console.error('Error al registrar decision de autorizacion:', {
            id_auth_request: idAuthRequest,
            error: errorMeta
        });
        return buildManagedTextResponse({
            number: phone_number,
            name: 'auth_request_error',
            message: resolveAuthSubmitErrorMessage({ error, idAuthRequest }),
            model: {
                flow: 'auth_request',
                event: 'submit_error',
                id_auth_request: idAuthRequest,
                error: errorMeta
            }
        });
    }
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
    let _context_row = null;
    // console.log("Mensaje recibido de Meta:", body.entry[0].changes[0].value.messages[0]);

    const authReasonResponse = await handleAuthReasonIfPending({
        message: _message,
        phone_number: _from,
        text: _text
    });
    if (authReasonResponse) {
        await storeIncomingForBot({
            message: _message,
            phone_number: _from,
            message_status: 'incoming_auth_reason',
            message_name: 'auth_request_reason_message',
            context_id: _id_context || null,
            extracted_text: _text
        });
        return authReasonResponse;
    }

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

        _context_row = _result[0];
        _type = _context_row?.type || '';
        _name = _context_row?.name || '';
        _url = _context_row?.url || null;
        _filename = _context_row?.filename || null;
        _caption = _context_row?.caption || null;

        await storeIncomingForBot({
            message: _message,
            phone_number: _from,
            message_status: 'incoming_context_resolved',
            message_name: 'incoming_message_with_context',
            context_id: _id_context,
            context_row: _context_row,
            extracted_text: _text
        });
    }

    // REVISAMOS QUE TIPO DE MENSAJE ES
    switch (_type) {
        case 'template':
            // AHORA VALIDAMOS EL NOMBRE DE LA PLANTILLA QUE SE ESTA UTILIZANDO
            switch (_name) {
                case AUTH_REQUEST_TEMPLATE_NAME: {
                    const decision = resolveAuthDecisionFromText(_text);

                    if (!decision) {
                        _model = buildManagedTextResponse({
                            number: _from,
                            name: 'auth_request_invalid_option',
                            message: 'Opcion invalida. Usa los botones Autorizar o Rechazar.',
                            model: {
                                flow: 'auth_request',
                                event: 'invalid_option',
                                received: _text
                            }
                        });
                        break;
                    }

                    const contextPayload = safeJsonParse(_context_row?.model) || {};
                    const bodyTexts = extractTemplateBodyTexts(contextPayload);
                    const encodedDetails = bodyTexts.length > 1 ? bodyTexts[1] : '';
                    const parsedDetails = parseAuthorizationDetails(encodedDetails);
                    const identifiers = parseAuthRequestIdentifiers(parsedDetails);
                    const idAuthRequest = identifiers.id_auth_request;
                    const idUsuario = identifiers.id_usuario;

                    if (!Number.isFinite(idAuthRequest)) {
                        _model = buildManagedTextResponse({
                            number: _from,
                            name: 'auth_request_missing_code',
                            message: 'No pude identificar el codigo de la solicitud. Asegura que el detalle incluya "Código: <id_auth>-<id_usuario>".',
                            model: {
                                flow: 'auth_request',
                                event: 'missing_code',
                                details: parsedDetails,
                                encoded: encodedDetails
                            }
                        });
                        break;
                    }

                    if (!Number.isFinite(idUsuario)) {
                        _model = buildManagedTextResponse({
                            number: _from,
                            name: 'auth_request_missing_user',
                            message: 'No pude identificar el usuario autorizador. Asegura que el detalle incluya "Código: <id_auth>-<id_usuario>".',
                            model: {
                                flow: 'auth_request',
                                event: 'missing_user',
                                id_auth_request: idAuthRequest,
                                details: parsedDetails,
                                encoded: encodedDetails
                            }
                        });
                        break;
                    }

                    try {
                        await clear_pending_auth_request({ phone_number: _from });
                    } catch (error) {
                        console.error('No se pudo limpiar flujo previo de autorizacion:', error.message);
                    }

                    try {
                        const pendingIdMessage = _message?.id
                            ? `auth_pending:${_message.id}`
                            : `auth_pending:${_from}:${Date.now()}`;

                        await store_incoming_message({
                            phone_number: _from,
                            type: _message?.type || 'incoming',
                            name: AUTH_REQUEST_PENDING_NAME,
                            id_message: pendingIdMessage,
                            message_status: AUTH_REQUEST_PENDING_STATUS,
                            model: {
                                flow: 'auth_request',
                                initiated_at: new Date().toISOString(),
                                context_id: _id_context || null,
                                pending_id_message: pendingIdMessage,
                                source_message_id: _message?.id || null,
                                id_auth_request: idAuthRequest,
                                decision: decision.decision,
                                decision_label: decision.label,
                                estado: decision.estado,
                                id_usuario: idUsuario,
                                template: {
                                    name: _name,
                                    params: bodyTexts
                                },
                                details: {
                                    encoded: encodedDetails,
                                    parsed: parsedDetails
                                }
                            }
                        });
                    } catch (error) {
                        console.error('No se pudo almacenar flujo pendiente de autorizacion:', error.message);
                    }

                    _model = buildManagedTextResponse({
                        number: _from,
                        name: 'auth_request_prompt_reason',
                        message: buildAuthReasonPrompt({
                            decisionLabel: decision.label,
                            idAuthRequest,
                            details: parsedDetails
                        }),
                        model: {
                            flow: 'auth_request',
                            event: 'prompt_reason',
                            id_auth_request: idAuthRequest,
                            id_usuario: idUsuario,
                            estado: decision.estado
                        }
                    });
                    break;
                }
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
