const { send_message } = require('./whatsapp');
const { message_templete } = require('../shared/whatsapp/custom_message');

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

const sendCrmLeadNotification = async ({ director, payload, seguimientoId, isNewThread }) => {
    const result = {
        attempted: false,
        sent: false,
        message: '',
        phone_number: ''
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

    const contactName = [payload?.nombre, payload?.apellido_paterno, payload?.apellido_materno]
        .filter(Boolean)
        .join(' ')
        .trim();
    const subject = String(payload?.asunto || 'N/D').replace(/\s+/g, ' ').trim();
    const firstParameter = String(director.nombre || 'DIRECTOR COMERCIAL').trim().toUpperCase();
    const thirdParameter = isNewThread
        ? `SE RECIBIO UN NUEVO LEAD: ${contactName || 'N/D'} | MENSAJE: ${subject} | FOLIO: #${seguimientoId}`
        : `EL LEAD ${contactName || 'N/D'} ENVIO UN NUEVO MENSAJE: ${subject} | FOLIO: #${seguimientoId}`;

    const payloadWhatsapp = message_templete({
        number: `+${phoneNumber}`,
        name: 'notify_operativo_general',
        language_code: 'es',
        components: [
            {
                type: 'body',
                parameters: [firstParameter, 'INBOX CRM', thirdParameter].map((text) => ({
                    type: 'text',
                    text
                }))
            }
        ]
    });

    result.attempted = true;

    try {
        const response = await send_message({
            payload: payloadWhatsapp,
            storeMeta: {
                type: 'template',
                name: 'notify_operativo_general',
                model: {
                    internal_name: 'crm_external_lead_notification',
                    seguimiento_id: seguimientoId,
                    is_new_thread: isNewThread,
                    recipient_name: director.nombre || null
                }
            }
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

module.exports = {
    sendCrmLeadNotification
};
