const express = require('express');
const cors = require('cors');
// const { connection } = require('../databases/config');
// const db = new DB();

class Server {

    constructor() {
        this.app = express();
        this.port = process.env.PORT;
        // ROUTE PATHS
        this.perfiles_path = '/api/perfiles';
        // BASE DE DATOS
        // this.connectdb();
        // MIDDLEWARES
        this.middlewares();
        // ROUTES
        this.routes();
    }

    // async connectdb() {
    //     await connection();
    // }

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
    }

    listen() {
        this.app.listen(this.port, () => {
            console.log('SERVIDOR CORRIENDO EN PUERTO ', this.port);
        });
    }
}

module.exports = Server;