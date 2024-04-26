const path = require('path');
const fs = require('fs/promises');
const handlebars = require('handlebars');

// Función para cargar y renderizar una plantilla HTML con Handlebars
const getLayoutNotificaciones = async (datos) => {
    try {
        // Construir la ruta completa del archivo de plantilla HTML
        let ruta = '../../views/emails/notificaciones.hbs';
        const rutaPlantillaHTML = path.join(__dirname, 'vistas', `${ruta}`);

        // Leer el contenido del archivo de plantilla HTML
        const contenidoPlantillaHTML = await fs.readFile(rutaPlantillaHTML, 'utf8');

        // Compilar la plantilla Handlebars
        const plantillaCompilada = handlebars.compile(contenidoPlantillaHTML);

        // Renderizar la plantilla con los datos proporcionados
        const contenidoHTML = plantillaCompilada(datos);

        return contenidoHTML;
    } catch (error) {
        throw new Error(`ERROR AL CARGAR LA PLANTILLA HTML: ${error.message}`);
    }
};

module.exports = {
    getLayoutNotificaciones
};
