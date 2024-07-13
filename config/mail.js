const nodemailer = require('nodemailer');
const { getLayoutTest, getSolicitudAutorizacion, getCancelacionCotizacion, getReciboIngreso, getReporteBancos } = require('../config/plantillas');

// Configuración del transporte SMTP
const transporter = nodemailer.createTransport({
    host: 'p3plzcpnl506083.prod.phx3.secureserver.net', // Nombre del host SMTP
    port: 465, // Puerto SMTP seguro
    secure: true, // true para usar SSL/TLS, false para SMTP no seguro
    auth: {
        user: 'info@mazatlaninternationalcenter.com', // Correo electrónico del remitente
        pass: 'zg3GL+U^Rl%x' // Contraseña del correo electrónico del remitente
    }
});

// Función asíncrona para enviar el correo electrónico
const enviarCorreo = async (datos) => {
    try {
        // Cargar y renderizar la plantilla HTML
        const contenidoHTML = await getLayoutTest(datos);

        // Objeto de configuración de correo electrónico
        const mailOptions = {
            from: 'info@mazatlaninternationalcenter.com', // Dirección de correo del remitente
            to: 'janto_sega5@hotmail.com', // Dirección de correo del destinatario
            subject: 'TEST', // Asunto del correo
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

module.exports = {
    enviarCorreo,
    mail_solicitudAutorizacion,
    mail_cancelacionCotizacion,
    mail_enviar_recibodeingreso,
    mail_enviar_reportebancos
};
