const http = require("https");
const { store_request } = require('../models/whatsapp');

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';

const normalizeUrl = (p) => {
    const url = typeof p?.url === 'string' ? p.url.trim() : '';
    const link = typeof p?.link === 'string' ? p.link.trim() : '';
    return url || link || null;
};

const safeJsonParse = (value) => {
    try {
        return JSON.parse(value);
    } catch (_error) {
        return null;
    }
};

const normalizeOutboundRequest = (_model) => {
    if (typeof _model === 'string') {
        return {
            payload: _model,
            storeMeta: {}
        };
    }

    if (_model && typeof _model === 'object' && typeof _model.payload === 'string') {
        return {
            payload: _model.payload,
            storeMeta: _model.storeMeta && typeof _model.storeMeta === 'object' ? _model.storeMeta : {}
        };
    }

    throw new Error('El modelo de WhatsApp no tiene un formato valido.');
};

const send_message = (_model) => {
    const normalizedRequest = normalizeOutboundRequest(_model);
    const _payload = normalizedRequest.payload;
    const _storeMeta = normalizedRequest.storeMeta;

    return new Promise((resolve, reject) => {
        if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
            const configError = new Error('La configuracion de WhatsApp no esta completa.');
            configError.statusCode = 500;
            configError.metaResponse = null;
            configError.storageError = null;
            reject(configError);
            return;
        }

        const _options = {
            host: "graph.facebook.com",
            path: `/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            method: "POST",
            port: 443,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Length': Buffer.byteLength(_payload)
            }
        };

        const request = http.request(_options, (response) => {
            let data = '';
            console.log('Status code:', response.statusCode);

            response.on('data', (chunk) => data += chunk);
            response.on('end', async () => {
                console.log('Respuesta WhatsApp:', data);

                const parsedResponse = safeJsonParse(data);
                const payloadResponse = safeJsonParse(_payload) || {};
                let storedRequest = null;
                let storageError = null;

                try {
                    const storageModel = _storeMeta.model && typeof _storeMeta.model === 'object'
                        ? {
                            ...payloadResponse,
                            _meta: _storeMeta.model
                        }
                        : payloadResponse;

                    storedRequest = await store_request({
                        phone_number: payloadResponse.to,
                        type: _storeMeta.type || payloadResponse.type,
                        name: _storeMeta.name || payloadResponse.template?.name || null,
                        id_message: parsedResponse?.messages?.[0]?.id || null,
                        message_status: parsedResponse?.messages?.[0]?.message_status || (response.statusCode >= 200 && response.statusCode < 300 ? 'accepted' : 'meta_error'),
                        url: _storeMeta.url || normalizeUrl(payloadResponse),
                        filename: _storeMeta.filename || payloadResponse?.filename || null,
                        caption: _storeMeta.caption || payloadResponse?.caption || null,
                        model: storageModel
                    });
                } catch (error) {
                    storageError = error.message;
                }

                const result = {
                    statusCode: response.statusCode || 500,
                    metaResponse: parsedResponse || { raw: data },
                    storedRequest,
                    storageError
                };

                if (result.statusCode >= 200 && result.statusCode < 300) {
                    resolve(result);
                    return;
                }

                const error = new Error('Meta rechazo el mensaje de WhatsApp.');
                error.statusCode = result.statusCode;
                error.metaResponse = result.metaResponse;
                error.storedRequest = result.storedRequest;
                error.storageError = result.storageError;
                reject(error);
            });
        });

        request.on("error", (error) => {
            console.error("Error al enviar mensaje:", error);
            const requestError = new Error('No se pudo establecer comunicacion con Meta.');
            requestError.statusCode = 502;
            requestError.metaResponse = null;
            requestError.storageError = null;
            reject(requestError);
        });

        request.write(_payload);
        request.end();
    });
}


module.exports = {
    send_message
}
