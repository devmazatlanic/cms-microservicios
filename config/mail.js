const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { getLayoutTest, getSolicitudAutorizacion, getCancelacionCotizacion, getReciboIngreso, getReporteBancos, webContactUs, webReminderContactUs } = require('../config/plantillas');

// Configuración del transporte SMTP
const transporter = nodemailer.createTransport({
    host: 'p3plzcpnl506083.prod.phx3.secureserver.net', // Nombre del host SMTP
    port: 587, // 465: Puerto SMTP seguro
    secure: false, // true para usar SSL/TLS, false para SMTP no seguro
    auth: {
        user: 'no-reply@mazatlaninternationalcenter.com', // Correo electrónico del remitente
        pass: 'wpN;5xrJaY=T' // Contraseña del correo electrónico del remitente
    },
    tls: {
        minVersion: 'TLSv1.2'      // Asegúrate de usar TLS 1.2 o superior
    },
    debug: true // Activa los logs de depuración
});

// Función asíncrona para enviar el correo electrónico
const enviarCorreo = async (datos) => {
    try {
        // Validar los campos requeridos
        if (!datos.to || !datos.subject || !datos.body) {
            throw new Error('Faltan datos requeridos para enviar el correo (to, subject, body).');
        }

        let attachmentConfig = [];
        let tempFilePath = "";

        // Manejo de adjuntos
        if (datos.attachments) {
            const fileUrl = datos.attachments;
            const fileName = path.basename(fileUrl);

            // Descargar el archivo
            const response = await axios.get(fileUrl, {
                responseType: 'arraybuffer',
                timeout: 30000 // 30 segundos
            });

            if (response.status !== 200) {
                throw new Error(`Error al descargar el archivo: ${response.statusText}`);
            }

            // Guardar el archivo en una ruta temporal
            tempFilePath = path.join(__dirname, fileName);
            fs.writeFileSync(tempFilePath, response.data);

            // Configuración del adjunto
            attachmentConfig.push({
                filename: fileName,
                path: tempFilePath
            });
        }

        // Configuración del correo
        const mailOptions = {
            from: 'no-reply@mazatlanic.com',
            to: datos.to,
            cc: datos.cc || '',
            subject: `INFORMATIVO - ${datos.subject.toUpperCase()}`,
            html: datos.body,
            attachments: attachmentConfig
        };

        // Enviar el correo
        const info = await transporter.sendMail(mailOptions);
        console.log('CORREO ENVIADO:', info.response);

        // Eliminar el archivo temporal
        if (tempFilePath) {
            await fs.promises.unlink(tempFilePath);
            console.log('ARCHIVO TEMPORAL ELIMINADO.');
        }
    } catch (error) {
        console.error('Error al enviar el correo:', error.message);
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
