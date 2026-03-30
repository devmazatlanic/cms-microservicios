const express = require('express');
const fs = require('fs');
const cors = require('cors');
const http = require('http');
const https = require('https');
const io = require('socket.io');

const parseJsonConfig = (value, fallback) => {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.warn(`[SERVER] No se pudo parsear configuracion JSON: ${error.message}`);
        return fallback;
    }
};

const getEnvBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    const normalized = String(value).trim().toLowerCase();

    if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
    }

    if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return defaultValue;
};

const normalizeOrigin = (origin) => String(origin || '').trim().replace(/\/+$/, '');
const normalizeOrigins = (origins = []) => {
    if (!Array.isArray(origins)) {
        return [];
    }

    return origins.map(normalizeOrigin).filter(Boolean);
};

const api_cors = parseJsonConfig(process.env.API_CORS, { origins: [], allowCredentials: false });
const socket_cors = parseJsonConfig(process.env.SOCKET_CORS, { origins: [], allowCredentials: false });

class Server {

    constructor() {
        this.app = express();
        this.port = process.env.PORT;
        this.apiCorsOrigins = normalizeOrigins(api_cors.origins);
        this.socketCorsOrigins = normalizeOrigins(socket_cors.origins);
        this.forceHttps = getEnvBoolean(process.env.APP_FORCE_HTTPS, false);
        this.enableHttpsServer = getEnvBoolean(process.env.APP_ENABLE_HTTPS_SERVER, false);
        this.enableIpDeviceRoute = getEnvBoolean(process.env.APP_ENABLE_IPDEVICE_ROUTE, false);

        this.app.disable('x-powered-by');
        this.configureTrustProxy();
        this.server = this.buildHttpServer();

        this.io = io(this.server, {
            cors: {
                origin: this.socketCorsOriginResolver.bind(this),
                methods: ['GET', 'POST'],
                credentials: socket_cors.allowCredentials,
            }
        });

        // ROUTE PATHS
        this.perfiles_path = '/api/perfiles';
        this.notificaciones_path = '/api/notificaciones';
        this.ingresos_path = '/api/ingresos';
        this.rfid_path = '/api/hware';
        this.pantallas_path = '/api/pantallas';
        this.web_path = '/api/web';
        this.whatsapp_path = '/api/whatsapp';
        this.mail_path = '/api/mail';
        // MIDDLEWARES
        this.middlewares();
        // ROUTES
        this.routes();
    }

    configureTrustProxy() {
        const trustProxyValue = String(process.env.APP_TRUST_PROXY || '').trim();

        if (!trustProxyValue) {
            return;
        }

        if (getEnvBoolean(trustProxyValue, false) === true) {
            this.app.set('trust proxy', true);
            return;
        }

        if (getEnvBoolean(trustProxyValue, true) === false) {
            this.app.set('trust proxy', false);
            return;
        }

        const numericValue = Number.parseInt(trustProxyValue, 10);
        if (Number.isFinite(numericValue)) {
            this.app.set('trust proxy', numericValue);
            return;
        }

        this.app.set('trust proxy', trustProxyValue);
    }

    buildHttpServer() {
        if (!this.enableHttpsServer) {
            return http.createServer(this.app);
        }

        const certs = this.loadCerts();
        if (!certs) {
            return http.createServer(this.app);
        }

        return https.createServer(certs, this.app);
    }

    loadCerts() {
        const keyPath = process.env.APP_HTTPS_KEY_PATH || './certs/privkey.pem';
        const certPath = process.env.APP_HTTPS_CERT_PATH || './certs/fullchain.pem';

        try {
            return {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            };
        } catch (err) {
            console.warn(`⚠️ Certificados no encontrados o invalidos (${keyPath}, ${certPath}). Usando HTTP.`);
            return null;
        }
    }

    apiCorsOriginResolver(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);
        const isAllowedOrigin = this.apiCorsOrigins.includes(normalizedOrigin);

        if (isAllowedOrigin) {
            return callback(null, true);
        }

        console.warn(`[CORS] Origen no permitido: ${normalizedOrigin}`);
        return callback(null, false);
    }

    socketCorsOriginResolver(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);
        const isAllowedOrigin = this.socketCorsOrigins.includes(normalizedOrigin);

        if (isAllowedOrigin) {
            return callback(null, true);
        }

        console.warn(`[SOCKET_CORS] Origen no permitido: ${normalizedOrigin}`);
        return callback('Not allowed by socket CORS', false);
    }

    setBasicSecurityHeaders(request, response, next) {
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('X-Frame-Options', 'SAMEORIGIN');
        response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        next();
    }

    isHttpsRequest(request) {
        if (request.secure) {
            return true;
        }

        const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
        return forwardedProto === 'https';
    }

    enforceHttps(request, response, next) {
        if (!this.forceHttps || this.isHttpsRequest(request)) {
            return next();
        }

        if (['GET', 'HEAD'].includes(request.method) && request.headers.host) {
            return response.redirect(308, `https://${request.headers.host}${request.originalUrl}`);
        }

        return response.status(426).json({
            next: false,
            message: 'HTTPS REQUIRED.'
        });
    }

    middlewares() {
        this.app.use(this.setBasicSecurityHeaders.bind(this));
        this.app.use(cors({
            origin: this.apiCorsOriginResolver.bind(this),
            methods: ['GET', 'POST'],
            credentials: api_cors.allowCredentials,
            optionsSuccessStatus: 204
        }));
        this.app.use(this.enforceHttps.bind(this));
        // PARSEO Y LECTURA DEL BODY
        this.app.use(express.json({ limit: '100kb' }));
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
        if (this.enableIpDeviceRoute) {
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
    }

    routes() {
        this.app.use(this.perfiles_path, require('../routes/perfiles'));
        this.app.use(this.notificaciones_path, require('../routes/notificaciones'));
        this.app.use(this.ingresos_path, require('../routes/ingresos'));
        this.app.use(this.rfid_path, require('../routes/rfid'));
        this.app.use(this.pantallas_path, require('../routes/pantallas'));
        this.app.use(this.web_path, require('../routes/web'));
        this.app.use(this.whatsapp_path, require('../routes/whatsapp'));
        this.app.use(this.mail_path, require('../routes/mail'));
    }

    initSocket() {
        const { sockeTConnect } = require('../helpers/sockets');

        sockeTConnect({
            io: this.io,
            client: ['airplay', 'siteweb'],
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
