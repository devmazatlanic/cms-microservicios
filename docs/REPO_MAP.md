# Repo Map

## Carpetas principales
- `config/`: inicializacion del servidor, correo y render de plantillas
- `controllers/`: controladores HTTP
- `routes/`: mapeo de endpoints
- `models/`: acceso a datos
- `helpers/`: sockets, utilidades y envio a WhatsApp
- `shared/`: construccion de payloads compartidos
- `docs/`: documentacion viva de contexto, riesgos, pendientes y bitacora
- `views/emails/`: plantillas de correo
- `public/`: contenido estatico
- `certs/`: certificados detectados
- `databases/`: configuracion local de base de datos detectada

## Funcion de cada carpeta
- `routes` delega solicitudes a `controllers`
- `controllers` validan parcialmente, llaman `models` y disparan side effects
- `models` encapsulan consultas SQL, inserts y llamadas a procedimientos
- `helpers` concentra integraciones no HTTP del dominio
- `config` contiene infraestructura del proceso

## Archivos importantes
- `app.js`
- `config/server.js`
- `config/mail.js`
- `config/plantillas.js`
- `docs/KNOWN_ISSUES.md`
- `docs/MAINTENANCE_LOG.md`
- `docs/PENDING_ITEMS.md`
- `helpers/sockets.js`
- `helpers/whatsapp.js`
- `helpers/tools.js`
- `controllers/whatsapp.js`
- `controllers/mail.js`
- `controllers/notificaciones.js`
- `controllers/rfid.js`
- `models/eventos.js`
- `databases/config.js`

## Puntos de entrada
- Entrada principal: `app.js`
- Bootstrap HTTP/Socket.IO: `config/server.js`
- Webhook WhatsApp: `/api/whatsapp`
- Correo simple transaccional: `/api/mail/simple`
- Socket server: inicializado desde `server.initSocket()`

## Configuracion clave
- `.env`: `PORT`, `API_CORS`, `SOCKET_CORS`, `APP_TRUST_PROXY`, `APP_FORCE_HTTPS`, `APP_ENABLE_HTTPS_SERVER`, `APP_HTTPS_KEY_PATH`, `APP_HTTPS_CERT_PATH`, `APP_ENABLE_IPDEVICE_ROUTE`, `INTERNAL_API_KEY`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`
- `.env`: `MAIL_*` para transporte SMTP y remitentes visibles
- `databases/config.js`: conexion o wrapper de MySQL
- `config/mail.js`: SMTP y envio de correos
- `certs/`: certificados locales detectados

## Relacion general entre modulos
- `server` monta rutas
- `routes` invoca `controllers`
- `controllers` consumen `models`, `helpers` y `config/mail`
- `controllers/mail` consume `config/mail` y usa plantilla corporativa simple para notificaciones transaccionales
- `models` consultan MySQL
- `helpers/whatsapp` llama a Meta
- `helpers/internal_api_key` protege endpoints internos confirmados mediante `x-api-key` o `Authorization: Bearer`
- `config/mail` llama a SMTP y usa `views/emails`
- `docs/*` concentra trazabilidad tecnica y seguimiento incremental del mantenimiento
