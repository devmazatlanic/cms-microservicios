const express = require('express');
const cors = require('cors');
const http = require('http');
const io = require('socket.io');

class Server {

    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = process.env.PORT;
        this.Io = io(this.server, {
            cors: {
                origin: 'http://177.230.59.180',
                methods: ['GET', 'POST'],
                allowedHeaders: ['Content-Type'],
                credentials: true
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
            req.io = this.Io; // Añade io al objeto de solicitud
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
        const { get_mac_address } = require('../helpers/tools');

        this.Io.on('connection', (socket) => {
            console.log('CLIENTE CONECTADO - socket:', socket);
            console.log('CLIENTE CONECTADO - Io:', this.Io);
            // get_mac_address => VAMOS A MANDAR LA MAC ADRESS A TRAVEZ DEL SOCKET
            // EL SOCKET DEBE DE CACHAR LA MAC ADRESS
            socket_pantalla({
                socket: socket,
                io: this.Io,
                name: 'getMac'
            });
            socket.on('disconnect', () => {
                console.log('CLIENTE DESCONECTADO:', socket.id);
            });
        });
    }

    listen() {
        this.server.listen(this.port, () => {
            console.log('SERVIDOR CORRIENDO EN PUERTO ', this.port);
        });
    }
}

module.exports = Server;