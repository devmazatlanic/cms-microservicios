const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { getSolicitudAutorizacion, getCancelacionCotizacion, getReciboIngreso, getReporteBancos, getSimpleNotification, webContactUs, webReminderContactUs } = require('../config/plantillas');

const getEnvBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    const normalized = String(value).trim().toLowerCase();

    if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
    }

    if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return defaultValue;
};

const getEnvInteger = (value, defaultValue) => {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
};

const MAIL_CONFIG = {
    host: process.env.MAIL_HOST || '',
    port: getEnvInteger(process.env.MAIL_PORT, 587),
    secure: getEnvBoolean(process.env.MAIL_SECURE, false),
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || '',
    requireTls: getEnvBoolean(process.env.MAIL_REQUIRE_TLS, false),
    tlsRejectUnauthorized: getEnvBoolean(process.env.MAIL_TLS_REJECT_UNAUTHORIZED, true),
    debug: getEnvBoolean(process.env.MAIL_DEBUG, false),
    pool: getEnvBoolean(process.env.MAIL_POOL, true),
    maxConnections: getEnvInteger(process.env.MAIL_MAX_CONNECTIONS, 1),
    maxMessages: getEnvInteger(process.env.MAIL_MAX_MESSAGES, 10),
    rateDeltaMs: getEnvInteger(process.env.MAIL_RATE_DELTA_MS, 60000),
    rateLimit: getEnvInteger(process.env.MAIL_RATE_LIMIT, 10),
    connectionTimeoutMs: getEnvInteger(process.env.MAIL_CONNECTION_TIMEOUT_MS, 15000),
    greetingTimeoutMs: getEnvInteger(process.env.MAIL_GREETING_TIMEOUT_MS, 15000),
    socketTimeoutMs: getEnvInteger(process.env.MAIL_SOCKET_TIMEOUT_MS, 30000),
    fromDefault: process.env.MAIL_FROM_DEFAULT || 'no-reply@mazatlanic.com',
    fromInfo: process.env.MAIL_FROM_INFO || 'info@mazatlanic.com',
    ccSistemas: process.env.MAIL_CC_SISTEMAS || 'sistemas@mazatlanic.com',
    ccWebContact: process.env.MAIL_CC_WEB_CONTACT || 'susana.arizmendi@mazatlanic.com'
};

let transporter = null;

const getMissingMailConfig = () => {
    const requiredKeys = [
        ['MAIL_HOST', MAIL_CONFIG.host],
        ['MAIL_USER', MAIL_CONFIG.user],
        ['MAIL_PASS', MAIL_CONFIG.pass]
    ];

    return requiredKeys
        .filter(([, value]) => !value)
        .map(([key]) => key);
};

const buildTransportOptions = () => {
    const options = {
        host: MAIL_CONFIG.host,
        port: MAIL_CONFIG.port,
        secure: MAIL_CONFIG.secure,
        requireTLS: MAIL_CONFIG.requireTls,
        auth: {
            user: MAIL_CONFIG.user,
            pass: MAIL_CONFIG.pass
        },
        tls: {
            rejectUnauthorized: MAIL_CONFIG.tlsRejectUnauthorized
        },
        debug: MAIL_CONFIG.debug,
        pool: MAIL_CONFIG.pool,
        maxConnections: MAIL_CONFIG.maxConnections,
        maxMessages: MAIL_CONFIG.maxMessages,
        connectionTimeout: MAIL_CONFIG.connectionTimeoutMs,
        greetingTimeout: MAIL_CONFIG.greetingTimeoutMs,
        socketTimeout: MAIL_CONFIG.socketTimeoutMs
    };

    if (MAIL_CONFIG.rateDeltaMs > 0 && MAIL_CONFIG.rateLimit > 0) {
        options.rateDelta = MAIL_CONFIG.rateDeltaMs;
        options.rateLimit = MAIL_CONFIG.rateLimit;
    }

    return options;
};

const logMailConfigurationWarning = () => {
    const missingConfig = getMissingMailConfig();
    if (missingConfig.length > 0) {
        console.warn(`[MAIL] Configuracion incompleta. Faltan variables: ${missingConfig.join(', ')}`);
    }
};

const getTransporter = () => {
    if (transporter) {
        return transporter;
    }

    const missingConfig = getMissingMailConfig();
    if (missingConfig.length > 0) {
        throw new Error(`La configuracion de correo no esta completa. Faltan: ${missingConfig.join(', ')}`);
    }

    transporter = nodemailer.createTransport(buildTransportOptions());
    console.log(`[MAIL] Transport SMTP inicializado para ${MAIL_CONFIG.host}:${MAIL_CONFIG.port} con pool=${MAIL_CONFIG.pool} rateLimit=${MAIL_CONFIG.rateLimit}/${MAIL_CONFIG.rateDeltaMs}ms.`);
    return transporter;
};

const sendMail = async (mailOptions) => {
    return getTransporter().sendMail(mailOptions);
};

logMailConfigurationWarning();

const isValidUrl = (str) => {
    try {
        const url = new URL(str);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
}

// opcional: si tu servidor NO puede acceder a cdn.mztmic.com desde fuera,
// aquí puedes traducir la URL pública a una interna (IP de la NAS)
const mapToInternalNasUrl = (publicUrl) => {
    // si desde tu Node sí ves cdn.mztmic.com:8000, regresas tal cual:
    return publicUrl;

    // si NO lo ves, puedes hacer algo así:
    // const url = new URL(publicUrl);
    // url.hostname = '192.168.90.123'; // IP interna de la NAS
    // url.port = '8000';
    // return url.toString();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const enviarCorreo_bk = async (datos, intento = 1) => {
    try {
        if (!datos.to || !datos.subject || !datos.body) {
            throw new Error('Faltan datos requeridos para enviar el correo (to, subject, body).');
        }

        let attachmentConfig = [];
        let tempFilePath = "";

        // Manejo de adjuntos con validación
        if (datos.attachments && isValidUrl(datos.attachments)) {
            const fileUrl = datos.attachments;
            const fileName = path.basename(fileUrl);

            const response = await axios.get(fileUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            if (response.status !== 200) {
                throw new Error(`Error al descargar el archivo: ${response.statusText}`);
            }

            tempFilePath = path.join(__dirname, fileName);
            fs.writeFileSync(tempFilePath, response.data);

            attachmentConfig.push({
                filename: fileName,
                path: tempFilePath
            });
        } else if (datos.attachments) {
            console.warn("URL del adjunto no válida:", datos.attachments);
        }

        const mailOptions = {
            from: MAIL_CONFIG.fromDefault,
            to: datos.to,
            cc: datos.cc || '',
            subject: `INFORMATIVO - ${datos.subject.toUpperCase()}`,
            html: datos.body,
            attachments: attachmentConfig
        };

        console.log(`------------------------------------------------------------------`);
        console.log(`ENVIANDO CORREO, ${mailOptions.subject}`);
        const info = await sendMail(mailOptions);
        console.log(`CORREO ENVIADO: ${info.response}`);

        if (info.response != "") {
            // ELIMINAMOS EL ARCHIVO ADJUNTO
            if (tempFilePath) {
                await fs.promises.unlink(tempFilePath);
                console.log('ARCHIVO TEMPORAL ELIMINADO.');
            }
        }
    } catch (error) {
        if (error.message.includes('421') && intento <= 3) {
            console.warn(`Intento ${intento} falló por límite SMTP. Reintentando en 5 segundos...`);
            await sleep(5000);
            return enviarCorreo(datos, intento + 1);
        }

        console.error('ERROR AL ENVIAR EL CORREO:', error.message);
        throw new Error(`ERROR AL ENVIAR EL CORREO: ${error.message}`);
    }
};

const enviarCorreo = async (datos, intento = 1) => {
    try {
        if (!datos.to || !datos.subject || !datos.body) {
            throw new Error('Faltan datos requeridos para enviar el correo (to, subject, body).');
        }

        let attachmentConfig = [];

        // Soportar 1 o varios adjuntos
        const attachmentsInput = datos.attachments
            ? (Array.isArray(datos.attachments) ? datos.attachments : [datos.attachments])
            : [];

        for (const adj of attachmentsInput) {
            if (!adj) continue;

            if (isValidUrl(adj)) {
                // URL pública (NAS / CDN)
                const fileUrl = mapToInternalNasUrl(adj);
                const urlObj = new URL(fileUrl);
                const fileName = decodeURIComponent(path.basename(urlObj.pathname));

                console.log(`Descargando adjunto desde NAS: ${fileUrl}`);

                const response = await axios.get(fileUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });

                if (response.status !== 200) {
                    throw new Error(`Error al descargar el archivo: ${response.status} - ${response.statusText}`);
                }

                attachmentConfig.push({
                    filename: fileName,
                    content: Buffer.from(response.data),
                    contentType: response.headers['content-type'] || 'application/pdf'
                });
            } else {
                console.warn('URL del adjunto no válida:', adj);
            }
        }

        const mailOptions = {
            from: 'no-reply@mazatlanic.com',
            to: datos.to,
            cc: datos.cc || '',
            subject: `INFORMATIVO - ${datos.subject.toUpperCase()}`,
            html: datos.body,
            attachments: attachmentConfig
        };

        console.log(`------------------------------------------------------------------`);
        console.log(`ENVIANDO CORREO, ${mailOptions.subject}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`CORREO ENVIADO: ${info.response}`);

        return info;
    } catch (error) {
        if (error.message.includes('421') && intento <= 3) {
            console.warn(`Intento ${intento} falló por límite SMTP. Reintentando en 5 segundos...`);
            await sleep(5000);
            return enviarCorreo(datos, intento + 1);
        }

        console.error('ERROR AL ENVIAR EL CORREO:', error.message);
        throw new Error(`ERROR AL ENVIAR EL CORREO: ${error.message}`);
    }
};

// Función asíncrona para enviar el correo electrónico
const mail_solicitudAutorizacion = async (datos) => {
    try {
        // Cargar y renderizar la plantilla HTML
        const contenidoHTML = await getSolicitudAutorizacion(datos);

        // Objeto de configuración de correo electrónico
        const mailOptions = {
            from: MAIL_CONFIG.fromInfo, // Dirección de correo del remitente 
            to: datos.email_quienautoriza, // Dirección de correo del destinatario
            cc: `${datos.email_quiensolicita}, ${MAIL_CONFIG.ccSistemas}`,
            subject: 'NOTIFICACION - SOLICITUD DE AUTORIZACION', // Asunto del correo
            html: contenidoHTML // Contenido del correo en texto plano
        };

        // Enviar el correo electrónico
        const info = await sendMail(mailOptions);
        console.log('CORREO ENVIADO:', info.response);
    } catch (error) {
        console.error('ERROR AL ENVIAR EL CORREO: ', error);
    }
};

// Función asíncrona para enviar el correo electrónico
const mail_cancelacionCotizacion = async (datos) => {
    try {
        // Cargar y renderizar la plantilla HTML
        const contenidoHTML = await getCancelacionCotizacion(datos);

        // Objeto de configuración de correo electrónico
        const mailOptions = {
            from: MAIL_CONFIG.fromInfo, // Dirección de correo del remitente 
            to: datos.email_quienautoriza, // Dirección de correo del destinatario
            // cc: datos.email_quiensolicita + ', sistemas@mazatlanic.com',
            cc: MAIL_CONFIG.ccSistemas,
            subject: `NOTIFICACION - CANCELACION DE LA COTIZACION CON FOLIO ${datos.cotizacion_id} DEL EVENTO ${datos.evento.evento.toUpperCase()}`, // Asunto del correo
            html: contenidoHTML // Contenido del correo en texto plano
        };

        // Enviar el correo electrónico
        const info = await sendMail(mailOptions);
        console.log('CORREO ENVIADO:', info.response);
    } catch (error) {
        console.error('ERROR AL ENVIAR EL CORREO: ', error);
    }
};

// Función asíncrona para enviar el correo electrónico
const mail_enviar_recibodeingreso = async (datos) => {
    try {
        // Cargar y renderizar la plantilla HTML
        const contenidoHTML = await getReciboIngreso(datos);

        // Objeto de configuración de correo electrónico
        const mailOptions = {
            from: MAIL_CONFIG.fromInfo, // Dirección de correo del remitente 
            to: datos.correos, // Dirección de correo del destinatario
            // cc: datos.email_quiensolicita + ', sistemas@mazatlanic.com',
            cc: MAIL_CONFIG.ccSistemas,
            subject: `NOTIFICACION - CONTRA RECIBO DE INGRESO CON EL FOLIO ${datos.response.id}`, // Asunto del correo
            html: contenidoHTML // Contenido del correo en texto plano
        };

        // Enviar el correo electrónico
        const info = await sendMail(mailOptions);
        console.log('CORREO ENVIADO:', info.response);
    } catch (error) {
        console.error('ERROR AL ENVIAR EL CORREO: ', error);
    }
};

// Función asíncrona para enviar el correo electrónico
const mail_enviar_reportebancos = async (datos) => {
    try {
        // Cargar y renderizar la plantilla HTML
        const contenidoHTML = await getReporteBancos(datos);

        // Objeto de configuración de correo electrónico
        const mailOptions = {
            from: MAIL_CONFIG.fromInfo, // Dirección de correo del remitente 
            to: datos.correo, // Dirección de correo del destinatario
            // cc: datos.email_quiensolicita + ', sistemas@mazatlanic.com',
            cc: MAIL_CONFIG.ccSistemas,
            subject: `NOTIFICACION - REPORTE DE DEPOSITOS BANCARIOS SIN IDENTIFICAR`, // Asunto del correo
            html: contenidoHTML // Contenido del correo en texto plano
        };

        // Enviar el correo electrónico
        const info = await sendMail(mailOptions);
        console.log('CORREO ENVIADO:', info.response);
    } catch (error) {
        console.error('ERROR AL ENVIAR EL CORREO: ', error);
    }
};

const mail_simple_notification = async (datos) => {
    try {
        const contenidoHTML = await getSimpleNotification(datos);

        const mailOptions = {
            from: MAIL_CONFIG.fromDefault,
            to: datos.to,
            cc: datos.cc || '',
            subject: datos.subject || 'NOTIFICACION - MAZATLAN INTERNATIONAL CENTER',
            html: contenidoHTML,
            attachments: [
                {
                    filename: 'logomic_correos.png',
                    path: './public/assets/images/logomic_correos.png',
                    cid: 'logoMIC'
                }
            ]
        };

        const info = await sendMail(mailOptions);
        console.log('CORREO ENVIADO:', info.response);
        return info;
    } catch (error) {
        console.error('ERROR AL ENVIAR EL CORREO: ', error);
        throw new Error(`ERROR AL ENVIAR EL CORREO SIMPLE: ${error.message}`);
    }
};

const mail_web_contactus = async (datos) => {
    try {
        // Cargar y renderizar la plantilla HTML
        const contenidoHTML = await webContactUs(datos);

        // Configuración del correo
        const mailOptions = {
            from: MAIL_CONFIG.fromDefault,
            to: datos.correo,
            cc: MAIL_CONFIG.ccWebContact,
            subject: '¡GRACIAS POR REGISTRARSE PARA REALIZAR SU PROXIMO EVENTO!',
            html: contenidoHTML,
            attachments: [
                {
                    filename: 'logomic_correos.png', // Nombre del archivo que verá el destinatario
                    path: './public/assets/images/logomic_correos.png', // Ruta del archivo en tu sistema
                    cid: 'logoMIC' // ID único para incrustar la imagen en el HTML (si es necesario)
                }
            ]
        };

        // Enviar el correo
        const info = await sendMail(mailOptions);
        console.log('CORREO ENVIADO:', info.response);

    } catch (error) {
        console.log(`ERROR AL ENVIAR EL CORREO: ${error}`);
        throw new Error('ERROR AL ENVIAR EL CORREO.');
    }
};

const mail_web_reminder_contactus = async (datos) => {
    try {
        // Cargar y renderizar la plantilla HTML
        const contenidoHTML = await webReminderContactUs(datos);

        // Configuración del correo
        const mailOptions = {
            from: MAIL_CONFIG.fromDefault,
            to: datos.correo,
            cc: MAIL_CONFIG.ccWebContact,
            subject: '¡GRACIAS POR CONTACTARNOS NUEVAMENTE!',
            html: contenidoHTML,
            attachments: [
                {
                    filename: 'logomic_correos.png', // Nombre del archivo que verá el destinatario
                    path: './public/assets/images/logomic_correos.png', // Ruta del archivo en tu sistema
                    cid: 'logoMIC' // ID único para incrustar la imagen en el HTML (si es necesario)
                }
            ]
        };

        // Enviar el correo
        const info = await sendMail(mailOptions);
        console.log('CORREO ENVIADO:', info.response);

    } catch (error) {
        console.log(`ERROR AL ENVIAR EL CORREO: ${error}`);
        throw new Error('ERROR AL ENVIAR EL CORREO.');
    }
};

module.exports = {
    enviarCorreo,
    mail_solicitudAutorizacion,
    mail_cancelacionCotizacion,
    mail_enviar_recibodeingreso,
    mail_enviar_reportebancos,
    mail_simple_notification,
    mail_web_contactus,
    mail_web_reminder_contactus
};
