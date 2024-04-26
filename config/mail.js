const nodemailer = require('nodemailer');
const { getLayoutNotificaciones } = require('../config/plantillas');

// Configuración del transporte SMTP
const transporter = nodemailer.createTransport({
    host: 'a2plcpnl0405.prod.iad2.secureserver.net', // Nombre del host SMTP
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
        const contenidoHTML = await getLayoutNotificaciones(datos);

        // Objeto de configuración de correo electrónico
        const mailOptions = {
            from: 'no-reply@mazatlaninternationalcenter.com', // Dirección de correo del remitente
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

module.exports = {
    enviarCorreo
};
