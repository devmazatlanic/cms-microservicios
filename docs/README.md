# cms-microservicios

## Que es este proyecto
Servicio Node.js orientado a exponer endpoints HTTP y eventos Socket.IO para funcionalidades relacionadas con notificaciones por correo, WhatsApp, RFID, pantallas y web publica.

## Objetivo general
Centralizar integraciones y flujos auxiliares del ecosistema actual del CRM/eventos, con enfasis en:
- envio de correos y notificaciones
- recepcion y envio de mensajes por WhatsApp
- registro de eventos de hardware RFID
- consulta de eventos para web publica
- entrega de playlists a pantallas

## Stack detectado
- Node.js
- Express 4
- Socket.IO 4
- MySQL
- Nodemailer
- Handlebars
- Axios
- dotenv
- macaddress

## Estructura basica
- `app.js`: arranque del servicio
- `config/`: servidor, correo y plantillas
- `routes/`: definicion de endpoints
- `controllers/`: logica HTTP principal
- `models/`: acceso a datos con SQL embebido
- `helpers/`: utilidades e integraciones auxiliares
- `shared/`: construccion de mensajes compartidos
- `views/emails/`: plantillas Handlebars
- `public/`: archivos estaticos
- `certs/`: certificados locales detectados

## Como correrlo
Pendiente de validacion:
- No se encontro `package.json` en el workspace analizado.
- Si se detecto `package-lock.json`, `node_modules` y `.env`.
- El arranque visible en codigo es:
  1. cargar variables con `dotenv`
  2. instanciar `Server`
  3. inicializar sockets
  4. escuchar en `PORT`

## Notas importantes
- El servidor actualmente crea un `http.createServer(...)`.
- Existe logica para cargar certificados, pero HTTPS esta comentado.
- El servicio depende de configuracion en `.env`, de una base MySQL y de credenciales externas.
- Se detectaron endpoints con efectos laterales reales, incluyendo mensajes de WhatsApp.
- El modulo de `notificaciones` esta deshabilitado temporalmente y sus rutas responden `410 Gone`.
- El webhook de WhatsApp ya sincroniza `message_status` en `whatsapp_requests` cuando Meta envia `statuses`.

## Advertencias y pendientes de validacion
- Pendiente de validacion: archivo `package.json` real usado en despliegue.
- Pendiente de validacion: configuracion real de base de datos en produccion.
- Pendiente de validacion: version de Node soportada.
- Se detecto informacion sensible versionada o almacenada en archivos del repositorio.
- Se detectaron inconsistencias entre la capa de base de datos local y lo que esperan los modelos.
