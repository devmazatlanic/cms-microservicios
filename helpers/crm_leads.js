const { send_message } = require('./whatsapp');
const { message_templete } = require('../shared/whatsapp/custom_message');
const db = require('../databases/config');
const { get_whatsapp_notification_config_by_type_detail } = require('../models/whatsapp');

const DEFAULT_CRM_TEMPLATE_NAME = 'notify_operativo_general';

const normalizeWhatsappPhone = (value) => {
    let digits = String(value || '').replace(/[^0-9]/g, '');

    if (digits.startsWith('0')) {
        digits = digits.replace(/^0+/, '');
    }

    if (digits.length === 10) {
        return `521${digits}`;
    }

    if (digits.length === 12 && digits.startsWith('52')) {
        return `521${digits.slice(2)}`;
    }

    if (digits.length === 13 && digits.startsWith('521')) {
        return digits;
    }

    return digits;
};

const maskPhone = (value) => {
    const phone = String(value || '');
    return phone.length > 4 ? `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}` : '****';
};

const normalizeText = (value) => String(value || '').trim();

const getLeadNotificationRoute = async (modeId) => {
    const parsedModeId = Number.parseInt(modeId, 10);

    if (!Number.isFinite(parsedModeId) || parsedModeId <= 0) {
        return null;
    }

    const rows = await db.query(`
        SELECT
            id,
            id_modo_contacto,
            id_whatsapp_type_detail
        FROM crm_lead_notification_routes
        WHERE id_modo_contacto = ?
          AND status_alta = 1
        ORDER BY id ASC
        LIMIT 1
    `, [parsedModeId]);

    return rows[0] || null;
};

const getNotificationRecipients = (rows = []) => {
    const recipients = [];
    const usedPhones = new Set();

    rows.forEach((row) => {
        const phoneNumber = normalizeWhatsappPhone(row.phone_number);
        if (!phoneNumber || usedPhones.has(phoneNumber)) {
            return;
        }

        usedPhones.add(phoneNumber);
        recipients.push({
            phone_number: phoneNumber,
            recipient_name: normalizeText(row.recipient_name) || null
        });
    });

    return recipients;
};

const buildLeadNotificationMessage = ({ recipientName, payload, seguimientoId, isNewThread }) => {
    const contactName = [payload?.nombre, payload?.apellido_paterno, payload?.apellido_materno]
        .filter(Boolean)
        .join(' ')
        .trim();
    const subject = String(payload?.asunto || 'N/D').replace(/\s+/g, ' ').trim();
    const firstParameter = normalizeText(recipientName || 'DIRECTOR COMERCIAL').toUpperCase();
    const thirdParameter = isNewThread
        ? `SE RECIBIO UN NUEVO LEAD: ${contactName || 'N/D'} | MENSAJE: ${subject} | FOLIO: #${seguimientoId}`
        : `EL LEAD ${contactName || 'N/D'} ENVIO UN NUEVO MENSAJE: ${subject} | FOLIO: #${seguimientoId}`;

    return [firstParameter, 'INBOX CRM', thirdParameter];
};

const sendTemplateToRecipient = async ({
    phoneNumber,
    recipientName,
    templateName,
    payload,
    seguimientoId,
    isNewThread,
    routeSource,
    modeId,
    whatsappTypeDetailId
}) => {
    const components = buildLeadNotificationMessage({
        recipientName,
        payload,
        seguimientoId,
        isNewThread
    });

    const payloadWhatsapp = message_templete({
        number: `+${phoneNumber}`,
        name: templateName,
        language_code: 'es',
        components: [
            {
                type: 'body',
                parameters: components.map((text) => ({
                    type: 'text',
                    text
                }))
            }
        ]
    });

    return send_message({
        payload: payloadWhatsapp,
        storeMeta: {
            type: 'template',
            name: templateName,
            model: {
                internal_name: 'crm_external_lead_notification',
                seguimiento_id: seguimientoId,
                is_new_thread: isNewThread,
                recipient_name: recipientName || null,
                route_source: routeSource,
                mode_id: modeId || null,
                id_whatsapp_type_detail: whatsappTypeDetailId || null
            }
        }
    });
};

const sendDirectorFallbackNotification = async ({ director, payload, seguimientoId, isNewThread, modeId, fallbackReason }) => {
    const result = {
        attempted: false,
        sent: false,
        message: '',
        phone_number: '',
        route_source: 'commercial_director',
        fallback_reason: fallbackReason || null
    };

    if (!director) {
        result.message = 'NO SE ENCONTRO UN DIRECTOR COMERCIAL ACTIVO PARA NOTIFICAR.';
        return result;
    }

    const phoneNumber = normalizeWhatsappPhone(director.celular || director.telefono);
    result.phone_number = maskPhone(phoneNumber);

    if (!phoneNumber) {
        result.message = 'EL DIRECTOR COMERCIAL NO CUENTA CON UN TELEFONO VALIDO.';
        return result;
    }

    result.attempted = true;

    try {
        const response = await sendTemplateToRecipient({
            phoneNumber,
            recipientName: director.nombre || 'DIRECTOR COMERCIAL',
            templateName: DEFAULT_CRM_TEMPLATE_NAME,
            payload,
            seguimientoId,
            isNewThread,
            routeSource: 'commercial_director',
            modeId
        });

        result.sent = true;
        result.message = 'NOTIFICACION ENVIADA AL DIRECTOR COMERCIAL.';
        result.meta_status_code = response.statusCode;
        result.stored_request_id = response.storedRequest?.insertId || null;
        result.storage_error = response.storageError
            ? 'NO FUE POSIBLE GUARDAR LA BITACORA DE WHATSAPP.'
            : null;

        if (response.storageError) {
            console.error('[WHATSAPP][CRM] ERROR AL GUARDAR BITACORA:', {
                seguimiento_id: seguimientoId,
                message: response.storageError
            });
        }
    } catch (error) {
        result.message = error.message;
        result.meta_status_code = error.statusCode || null;
        result.storage_error = error.storageError
            ? 'NO FUE POSIBLE GUARDAR LA BITACORA DE WHATSAPP.'
            : null;
        console.error('[WHATSAPP][CRM] ERROR AL NOTIFICAR LEAD:', {
            seguimiento_id: seguimientoId,
            meta_status_code: result.meta_status_code,
            message: result.message,
            storage_error: error.storageError || null
        });
    }

    return result;
};

const sendRoutedNotification = async ({ route, payload, seguimientoId, isNewThread, modeId }) => {
    const configurationRows = await get_whatsapp_notification_config_by_type_detail(
        route.id_whatsapp_type_detail
    );
    const configuration = configurationRows[0] || null;
    const templateName = normalizeText(configuration?.template_name);

    if (!configuration || !templateName) {
        return {
            next: false,
            reason: 'missing_template_configuration',
            id_whatsapp_type_detail: route.id_whatsapp_type_detail
        };
    }

    const recipients = getNotificationRecipients(configurationRows);
    if (recipients.length === 0) {
        return {
            next: false,
            reason: 'missing_recipients',
            template_name: templateName,
            id_whatsapp_type_detail: route.id_whatsapp_type_detail
        };
    }

    const result = {
        attempted: true,
        sent: false,
        message: '',
        route_source: 'configured_route',
        mode_id: modeId || null,
        id_whatsapp_type_detail: route.id_whatsapp_type_detail,
        template_name: templateName,
        total_recipients: recipients.length,
        total_sent: 0,
        total_failed: 0,
        recipients: []
    };

    for (const recipient of recipients) {
        const recipientResult = {
            phone_number: maskPhone(recipient.phone_number),
            recipient_name: recipient.recipient_name,
            sent: false,
            message: ''
        };

        try {
            const response = await sendTemplateToRecipient({
                phoneNumber: recipient.phone_number,
                recipientName: recipient.recipient_name || 'ENCARGADO',
                templateName,
                payload,
                seguimientoId,
                isNewThread,
                routeSource: 'configured_route',
                modeId,
                whatsappTypeDetailId: route.id_whatsapp_type_detail
            });

            recipientResult.sent = true;
            recipientResult.message = 'NOTIFICACION ENVIADA.';
            recipientResult.meta_status_code = response.statusCode;
            recipientResult.stored_request_id = response.storedRequest?.insertId || null;
            recipientResult.storage_error = response.storageError
                ? 'NO FUE POSIBLE GUARDAR LA BITACORA DE WHATSAPP.'
                : null;
            result.total_sent += 1;

            if (response.storageError) {
                console.error('[WHATSAPP][CRM] ERROR AL GUARDAR BITACORA:', {
                    seguimiento_id: seguimientoId,
                    recipient_name: recipient.recipient_name,
                    message: response.storageError
                });
            }
        } catch (error) {
            recipientResult.message = error.message;
            recipientResult.meta_status_code = error.statusCode || null;
            recipientResult.storage_error = error.storageError
                ? 'NO FUE POSIBLE GUARDAR LA BITACORA DE WHATSAPP.'
                : null;
            result.total_failed += 1;

            console.error('[WHATSAPP][CRM] ERROR AL NOTIFICAR LEAD POR RUTA:', {
                seguimiento_id: seguimientoId,
                id_whatsapp_type_detail: route.id_whatsapp_type_detail,
                recipient_name: recipient.recipient_name,
                meta_status_code: recipientResult.meta_status_code,
                message: recipientResult.message,
                storage_error: error.storageError || null
            });
        }

        result.recipients.push(recipientResult);
    }

    result.sent = result.total_sent > 0;
    result.message = result.sent
        ? 'NOTIFICACION CRM ENVIADA POR RUTA CONFIGURADA.'
        : 'NO FUE POSIBLE ENVIAR LA NOTIFICACION CRM POR RUTA CONFIGURADA.';

    return result;
};

const sendCrmLeadNotification = async ({ director, payload, seguimientoId, isNewThread, modeId }) => {
    const resolvedModeId = Number.parseInt(modeId || payload?.id_modo_contacto, 10);

    try {
        const route = await getLeadNotificationRoute(resolvedModeId);

        if (route) {
            const routedResult = await sendRoutedNotification({
                route,
                payload,
                seguimientoId,
                isNewThread,
                modeId: resolvedModeId
            });

            if (routedResult.next !== false) {
                return routedResult;
            }

            return sendDirectorFallbackNotification({
                director,
                payload,
                seguimientoId,
                isNewThread,
                modeId: resolvedModeId,
                fallbackReason: routedResult.reason
            });
        }
    } catch (error) {
        console.error('[WHATSAPP][CRM] ERROR AL RESOLVER RUTA DE NOTIFICACION:', {
            seguimiento_id: seguimientoId,
            mode_id: resolvedModeId || null,
            message: error.message
        });

        return sendDirectorFallbackNotification({
            director,
            payload,
            seguimientoId,
            isNewThread,
            modeId: resolvedModeId,
            fallbackReason: 'route_lookup_error'
        });
    }

    return sendDirectorFallbackNotification({
        director,
        payload,
        seguimientoId,
        isNewThread,
        modeId: resolvedModeId,
        fallbackReason: 'route_not_configured'
    });
};

module.exports = {
    sendCrmLeadNotification
};
