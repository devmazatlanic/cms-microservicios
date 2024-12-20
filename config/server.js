const express = require('express');
const cors = require('cors');
const http = require('http');
const io = require('socket.io');
const local_cors = JSON.parse(process.env.LOCAL_CORS);
const cors_config = JSON.parse(process.env.CORS_CONFIG);

class Server {

    constructor() {
        const corsConfig = JSON.parse(process.env.CORS_CONFIG);
        this.app = express();
        this.app.use(cors({
            // origin: local_cors.origins,
            methods: ['GET', 'POST'],
            credentials: local_cors.allowCredentials
        }));
        this.port = process.env.PORT;
        this.server = http.createServer(this.app);

        this.io = io(this.server, {
            cors: {
                origin: cors_config.origins,
                methods: ['GET', 'POST'],
                credentials: cors_config.allowCredentials,
            }
        });
        // ROUTE PATHS
        this.perfiles_path = '/api/perfiles';
        this.notificaciones_path = '/api/notificaciones';
        this.ingresos_path = '/api/ingresos';
        this.rfid_path = '/api/hware';
        this.pantallas_path = '/api/pantallas';
        this.web_path = '/api/web';
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


        // this.app.use((req, res, next) => {
        //     const clientIp = req.ip;
        //     console.log(`IP del cliente: ${clientIp}`);
        //     req.clientIp = clientIp;
        //     next();
        // });
    
        

        this.app.get('/ipdevice', async (req, res) => {
            const ip = 
            req.headers['cf-connecting-ip'] ||  
            req.headers['x-real-ip'] ||
            req.headers['x-forwarded-for'] ||
            req.socket.remoteAddress || '';
                console.log(ip);
                res.send(`Client IP: ${ip}`);
            });
        }

    routes() {
        this.app.use(this.perfiles_path, require('../routes/perfiles'));
        this.app.use(this.notificaciones_path, require('../routes/notificaciones'));
        this.app.use(this.ingresos_path, require('../routes/ingresos'));
        this.app.use(this.rfid_path, require('../routes/rfid'));
        this.app.use(this.pantallas_path, require('../routes/pantallas'));
        this.app.use(this.web_path, require('../routes/web'));
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