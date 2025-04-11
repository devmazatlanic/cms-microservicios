const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { getLayoutTest, getSolicitudAutorizacion, getCancelacionCotizacion, getReciboIngreso, getReporteBancos, webContactUs, webReminderContactUs } = require('../config/plantillas');
const { Console } = require('console');

// Configuración del transporte SMTP
const transporter = nodemailer.createTransport({
    host: 'p3plzcpnl506083.prod.phx3.secureserver.net', // Nombre del host SMTP
    port: 587, // 465: Puerto SMTP seguro
    secure: false, // true para usar SSL/TLS, false para SMTP no seguro
    auth: {
        user: 'osmzt@mztmic.com', // Correo electrónico del remitente  user: 'info@mztmic.com'
        pass: 'I0a!(_04v(EK' // Contraseña del correo electrónico del remitente pass: '[9DcNFo2{;_Z'
    },
    tls: {
        minVersion: 'TLSv1.2'      // Asegúrate de usar TLS 1.2 o superior
    },
    debug: true, // Activa los logs de depuración
    pool: true,
    maxConnections: 5,    // Ajusta este número según lo permitido
    maxMessages: 100,     // Cantidad de mensajes por conexión

});

const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const enviarCorreo = async (datos, intento = 1) => {
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

        if(info.response != ""){
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

// Función asíncrona para enviar el correo electrónico
const mail_solicitudAutorizacion = async (datos) => {
    try {
        // Cargar y renderizar la plantilla HTML
        const contenidoHTML = await getSolicitudAutorizacion(datos);

        // Objeto de configuración de correo electrónico
        const mailOptions = {
            from: 'info@mazatlanic.com', // Dirección de correo del remitente 
            to: datos.email_quienautoriza, // Dirección de correo del destinatario
            cc: datos.email_quiensolicita + ', sistemas@mazatlanic.com',
            subject: 'NOTIFICACION - SOLICITUD DE AUTORIZACION', // Asunto del correo
            html: contenidoHTML // Contenido del correo en texto plano
        };

        // Enviar el correo electrónico
        const info = await transporter.sendMail(mailOptions);
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
            from: 'info@mazatlanic.com', // Dirección de correo del remitente 
            to: datos.email_quienautoriza, // Dirección de correo del destinatario
            // cc: datos.email_quiensolicita + ', sistemas@mazatlanic.com',
            cc: 'sistemas@mazatlanic.com',
            subject: `NOTIFICACION - CANCELACION DE LA COTIZACION CON FOLIO ${datos.cotizacion_id} DEL EVENTO ${datos.evento.evento.toUpperCase()}`, // Asunto del correo
            html: contenidoHTML // Contenido del correo en texto plano
        };

        // Enviar el correo electrónico
        const info = await transporter.sendMail(mailOptions);
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
            from: 'info@mazatlanic.com', // Dirección de correo del remitente 
            to: datos.correos, // Dirección de correo del destinatario
            // cc: datos.email_quiensolicita + ', sistemas@mazatlanic.com',
            cc: 'sistemas@mazatlanic.com',
            subject: `NOTIFICACION - CONTRA RECIBO DE INGRESO CON EL FOLIO ${datos.response.id}`, // Asunto del correo
            html: contenidoHTML // Contenido del correo en texto plano
        };

        // Enviar el correo electrónico
        const info = await transporter.sendMail(mailOptions);
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
            from: 'info@mazatlanic.com', // Dirección de correo del remitente 
            to: datos.correo, // Dirección de correo del destinatario
            // cc: datos.email_quiensolicita + ', sistemas@mazatlanic.com',
            cc: 'sistemas@mazatlanic.com',
            subject: `NOTIFICACION - REPORTE DE DEPOSITOS BANCARIOS SIN IDENTIFICAR`, // Asunto del correo
            html: contenidoHTML // Contenido del correo en texto plano
        };

        // Enviar el correo electrónico
        const info = await transporter.sendMail(mailOptions);
        console.log('CORREO ENVIADO:', info.response);
    } catch (error) {
        console.error('ERROR AL ENVIAR EL CORREO: ', error);
    }
};

const mail_web_contactus = async (datos) => {
    try {
        // Cargar y renderizar la plantilla HTML
        const contenidoHTML = await webContactUs(datos);

        // Configuración del correo
        const mailOptions = {
            from: 'no-reply@mazatlanic.com',
            to: datos.correo,
            cc: 'susana.arizmendi@mazatlanic.com',
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
        const info = await transporter.sendMail(mailOptions);
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
            from: 'no-reply@mazatlanic.com',
            to: datos.correo,
            cc: 'susana.arizmendi@mazatlanic.com',
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
        const info = await transporter.sendMail(mailOptions);
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
    mail_web_contactus,
    mail_web_reminder_contactus
};
