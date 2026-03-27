# Architecture

## Patron general detectado
Arquitectura tipo MVC ligera con responsabilidades separadas por carpeta, pero sin capa de servicios intermedia.

## Capas del sistema
- Capa de entrada: Express + Socket.IO
- Capa de aplicacion: controllers y helpers
- Capa de acceso a datos: models y pool MySQL compartido
- Capa de integracion: SMTP, WhatsApp Cloud API, archivos locales, MySQL

## Componentes principales
- Servidor Express
- Servidor Socket.IO
- Modulo de correo y plantillas
- Modulo WhatsApp
- Modulo RFID
- Modulo Web publica
- Modulo Pantallas/playlist
- Acceso a MySQL

## Flujo general de ejecucion
1. `app.js` carga variables de entorno.
2. Se crea una instancia de `Server`.
3. `Server` configura middlewares, rutas y Socket.IO.
4. Las rutas delegan a controladores.
5. Los controladores ejecutan consultas o inserts via modelos.
6. Algunos controladores disparan side effects externos:
   - correos
   - mensajes WhatsApp
   - eventos socket

## Dependencias internas
- `controllers -> models`
- `controllers -> config/mail`
- `controllers -> helpers`
- `helpers -> models`
- `models -> databases/config.js`
- `config/mail -> config/plantillas -> views/emails`

## Nota sobre acceso a datos
- La implementacion visible usa un pool MySQL compartido.
- Se mantiene compatibilidad con dos estilos de consumo:
  - `connection.query(...)` para modelos legacy
  - `db.query(...)` para modulos con wrapper Promise
- Pendiente de validacion: confirmar que esta implementacion coincide con la configuracion efectiva del entorno productivo.

## Integraciones externas
- MySQL
- SMTP configurable por entorno
- WhatsApp Cloud API / Meta
- certificados TLS locales detectados
- archivos estaticos y plantillas locales

## Nota sobre correo
- `config/mail.js` concentra hoy el transporte SMTP, el armado de correos y parte del manejo de adjuntos.
- La configuracion del transporte ya depende de variables `MAIL_*`, con pool, throttling y timeouts configurables.
- El proveedor SMTP productivo sigue pendiente de definicion formal; la implementacion actual permite cambiar de relay o servicio transaccional sin tocar controladores.
- Existe un endpoint interno `POST /api/mail/simple` para notificaciones breves con plantilla corporativa reutilizable.

## Nota sobre WhatsApp
- El modulo de WhatsApp funciona como integracion interna para envio transaccional y recepcion de webhooks.
- La bitacora principal visible es `whatsapp_requests`.
- El webhook ya procesa `messages` y `statuses`, recorriendo todos los `entry` y `changes` visibles en el payload y sincronizando `message_status` en la bitacora local.
- Los mensajes entrantes con y sin contexto util ya se registran y existe un menu/bot textual inicial para orientar mensajes libres sin inventar flujos de negocio adicionales.

## Riesgos arquitectonicos
- Alto acoplamiento entre logica HTTP, SQL e integraciones externas.
- Validacion dispersa y no uniforme.
- SQL embebido en multiples modulos.
- Duplicacion de logica en modelos y sockets.
- Configuracion sensible mezclada con codigo.
- Pendiente de validacion: arquitectura real de despliegue y terminacion TLS.
