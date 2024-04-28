const express = require('express');
const cors = require('cors');

class Server {

    constructor() {
        this.app = express();
        this.port = process.env.PORT;
        // ROUTE PATHS
        this.perfiles_path = '/api/perfiles';
        this.notificaciones_path = '/api/notificaciones';
        // MIDDLEWARES
        this.middlewares();
        // ROUTES
        this.routes();
    }

    middlewares() {
        // CORS
        this.app.use(cors());
        // PARSEO Y LECTURA DEL BODY
        this.app.use(express.json());
        // DIRECTORIO PUBLICO
        this.app.use(express.static('public'));
    }

    routes() {
        this.app.use(this.perfiles_path, require('../routes/perfiles'));
        this.app.use(this.notificaciones_path, require('../routes/notificaciones'));
    }

    listen() {
        this.app.listen(this.port, () => {
            console.log('SERVIDOR CORRIENDO EN PUERTO ', this.port);
        });
    }
}

module.exports = Server;