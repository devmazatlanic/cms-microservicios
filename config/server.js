const express = require('express');
const cors = require('cors');
const http = require('http');
const io = require('socket.io');

class Server {

    constructor() {
        this.app = express();
        this.app.use(cors({
            origin: 'http://dev.mazatlanic.local',
            methods: ['GET', 'POST'],
            credentials: true,
        }));
        this.port = process.env.PORT;
        this.server = http.createServer(this.app);
        const corsConfig = JSON.parse(process.env.CORS_CONFIG);

        this.io = io(this.server, {
            cors: {
                origin: corsConfig.origins,
                methods: ['GET', 'POST'],
                credentials: corsConfig.allowCredentials,
            }
        });
        // ROUTE PATHS
        this.perfiles_path = '/api/perfiles';
        this.notificaciones_path = '/api/notificaciones';
        this.ingresos_path = '/api/ingresos';
        this.rfid_path = '/api/hware';
        this.pantallas_path = '/api/pantallas';
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

        //SOCKETS
        this.app.use((req, res, next) => {
            req.io = this.io; // Añade io al objeto de solicitud
            next();
        });
    }

    routes() {
        this.app.use(this.perfiles_path, require('../routes/perfiles'));
        this.app.use(this.notificaciones_path, require('../routes/notificaciones'));
        this.app.use(this.ingresos_path, require('../routes/ingresos'));
        this.app.use(this.rfid_path, require('../routes/rfid'));
        this.app.use(this.pantallas_path, require('../routes/pantallas'));
    }

    initSocket() {
        const { socket_pantalla } = require('../controllers/pantallas');

        socket_pantalla({
            io: this.io,
            client: 'data',
            server: 'response'
        });

    }

    listen() {
        this.server.listen(this.port, () => {
            console.log('SERVIDOR CORRIENDO EN PUERTO ', this.port);
        });
    }
}

module.exports = Server;