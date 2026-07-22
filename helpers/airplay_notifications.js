const { getPantallabyToken } = require('../models/pantallas');
const { get_whatsapp_notification_config_by_type_detail } = require('../models/whatsapp');
const { message_templete } = require('../shared/whatsapp/custom_message');
const { send_message } = require('./whatsapp');

const DEFAULT_NOTIFICATION_DETAIL_ID = 11;
const DEFAULT_DISCONNECT_DELAY_MS = 60 * 1000;
const AIRPLAY_DISCONNECT_NOTIFICATION_DETAIL_ID = (() => {
    const value = Number.parseInt(process.env.AIRPLAY_DISCONNECT_NOTIFICATION_DETAIL_ID, 10);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_NOTIFICATION_DETAIL_ID;
})();
const AIRPLAY_DISCONNECT_DELAY_MS = (() => {
    const value = Number.parseInt(process.env.AIRPLAY_DISCONNECT_DELAY_MS, 10);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_DISCONNECT_DELAY_MS;
})();

const disconnectTimers = new Map();

const normalizeText = (value) => String(value || '').trim();

const maskPhone = (phone) => {
    const normalizedPhone = normalizeText(phone);
    if (normalizedPhone.length <= 4) {
        return normalizedPhone;
    }

    return `${'*'.repeat(normalizedPhone.length - 4)}${normalizedPhone.slice(-4)}`;
};

const cancelAirplayDisconnectNotification = (token) => {
    const normalizedToken = normalizeText(token);
    const pendingAlert = disconnectTimers.get(normalizedToken);

    if (!pendingAlert) {
        return false;
    }

    clearTimeout(pendingAlert.timer);
    disconnectTimers.delete(normalizedToken);

    console.log('[WHATSAPP][AIRPLAY] ALERTA CANCELADA POR RECONEXION:', {
        token: normalizedToken,
        delay_ms: AIRPLAY_DISCONNECT_DELAY_MS
    });

    return true;
};

const getScreenName = async (token) => {
    try {
        const screens = await getPantallabyToken(token);
        const screen = Array.isArray(screens) ? screens[0] : null;
        return normalizeText(screen?.nombre) || normalizeText(token);
    } catch (error) {
        console.error('[WHATSAPP][AIRPLAY] NO SE PUDO OBTENER EL NOMBRE DE LA PANTALLA:', {
            token,
            error: error.message
        });
        return normalizeText(token);
    }
};

const getNotificationRecipients = (rows = []) => {
    const recipients = [];
    const usedPhones = new Set();

    rows.forEach((row) => {
        const phoneNumber = normalizeText(row.phone_number);
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

const sendAirplayDisconnectNotification = async (event = {}) => {
    const token = normalizeText(event.token);
    if (!token) {
        console.warn('[WHATSAPP][AIRPLAY] ALERTA OMITIDA: NO SE RECIBIO TOKEN.');
        return {
            next: false,
            reason: 'missing_token',
            total_sent: 0,
            total_failed: 0
        };
    }

    const screenName = await getScreenName(token);
    const configurationRows = await get_whatsapp_notification_config_by_type_detail(
        AIRPLAY_DISCONNECT_NOTIFICATION_DETAIL_ID
    );
    const configuration = configurationRows[0] || null;
    const templateName = normalizeText(configuration?.template_name);

    if (!configuration || !templateName) {
        console.warn('[WHATSAPP][AIRPLAY] ALERTA OMITIDA: CONFIGURACION DE PLANTILLA NO DISPONIBLE:', {
            detail_id: AIRPLAY_DISCONNECT_NOTIFICATION_DETAIL_ID
        });
        return {
            next: false,
            reason: 'missing_template_configuration',
            total_sent: 0,
            total_failed: 0
        };
    }

    const recipients = getNotificationRecipients(configurationRows);
    if (recipients.length === 0) {
        console.warn('[WHATSAPP][AIRPLAY] ALERTA OMITIDA: NO HAY DESTINATARIOS ACTIVOS:', {
            detail_id: AIRPLAY_DISCONNECT_NOTIFICATION_DETAIL_ID,
            template_name: templateName
        });
        return {
            next: false,
            reason: 'missing_recipients',
            template_name: templateName,
            total_sent: 0,
            total_failed: 0
        };
    }

    const components = [
        'ENCARGADO',
        'MONITOREO PANTALLAS',
        `La pantalla ${screenName} se desconectó del socket.`
    ];
    const results = [];

    for (const recipient of recipients) {
        const payload = message_templete({
            number: `521${recipient.phone_number}`,
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

        try {
            const result = await send_message({
                payload,
                storeMeta: {
                    type: 'template',
                    name: templateName,
                    model: {
                        internal_name: 'airplay_disconnect_notification',
                        event: 'airplay_disconnected',
                        notification_detail_id: AIRPLAY_DISCONNECT_NOTIFICATION_DETAIL_ID,
                        token,
                        screen_name: screenName,
                        disconnect_reason: normalizeText(event.presence?.last_disconnect_reason) || 'unknown',
                        recipient_name: recipient.recipient_name,
                        disconnected_at: event.presence?.last_disconnect_at || null
                    }
                }
            });

            results.push({
                phone_number: recipient.phone_number,
                next: true,
                meta_status_code: result.statusCode,
                stored_request_id: result.storedRequest?.insertId || null,
                storage_error: result.storageError || null
            });
        } catch (error) {
            console.error('[WHATSAPP][AIRPLAY] ERROR AL ENVIAR ALERTA:', {
                token,
                template_name: templateName,
                phone_number: maskPhone(recipient.phone_number),
                meta_status_code: error.statusCode || null,
                error: error.message
            });
            results.push({
                phone_number: recipient.phone_number,
                next: false,
                meta_status_code: error.statusCode || null,
                error: error.message
            });
        }
    }

    const totalSent = results.filter((result) => result.next).length;
    const totalFailed = results.length - totalSent;

    console.log('[WHATSAPP][AIRPLAY] ALERTA PROCESADA:', {
        token,
        screen_name: screenName,
        template_name: templateName,
        total_recipients: recipients.length,
        total_sent: totalSent,
        total_failed: totalFailed
    });

    return {
        next: totalSent > 0,
        token,
        screen_name: screenName,
        template_name: templateName,
        total_recipients: recipients.length,
        total_sent: totalSent,
        total_failed: totalFailed,
        results
    };
};

const scheduleAirplayDisconnectNotification = (event = {}) => {
    const token = normalizeText(event.token);
    if (!token) {
        return false;
    }

    cancelAirplayDisconnectNotification(token);

    const timer = setTimeout(() => {
        disconnectTimers.delete(token);
        sendAirplayDisconnectNotification(event).catch((error) => {
            console.error('[WHATSAPP][AIRPLAY] ERROR NO CONTROLADO EN ALERTA:', {
                token,
                error: error.message
            });
        });
    }, AIRPLAY_DISCONNECT_DELAY_MS);

    disconnectTimers.set(token, {
        timer,
        scheduled_at: new Date().toISOString()
    });

    console.log('[WHATSAPP][AIRPLAY] ALERTA PROGRAMADA:', {
        token,
        delay_ms: AIRPLAY_DISCONNECT_DELAY_MS
    });

    return true;
};

module.exports = {
    cancelAirplayDisconnectNotification,
    scheduleAirplayDisconnectNotification,
    sendAirplayDisconnectNotification
};
