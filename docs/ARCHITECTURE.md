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

## Nota sobre seguridad perimetral
- El servicio ya admite normalizacion de CORS por origen y proteccion por API key para endpoints internos confirmados.
- La terminacion TLS recomendada para este proyecto es en el hosting o reverse proxy; la app mantiene soporte opcional para certificados locales solo si se habilita por configuracion.
- El servicio puede confiar en `x-forwarded-proto` y cabeceras de proxy mediante `APP_TRUST_PROXY`, pendiente de validacion final en produccion.

## Nota sobre WhatsApp
- El modulo de WhatsApp funciona como integracion interna para envio transaccional y recepcion de webhooks.
- La bitacora principal visible es `whatsapp_requests`.
- El webhook ya procesa `messages` y `statuses`, recorriendo todos los `entry` y `changes` visibles en el payload y sincronizando `message_status` en la bitacora local.
- Los mensajes entrantes con y sin contexto util ya se registran y existe un menu/bot textual inicial para orientar mensajes libres sin inventar flujos de negocio adicionales.

## Nota sobre pantallas / Socket `airplay`
- El flujo `airplay` se consume desde un cliente externo en `cms-mazatlanic`, que se conecta por Socket.IO. La pantalla publica puede recibir el token canonico de `scr_pantallas` mediante `?token=...`; si no se proporciona, se conserva compatibilidad con el `clientId` persistente de `localStorage`.
- El microservicio mantiene ahora un registro de presencia `airplay` en memoria del proceso Node, con `connected_at`, `last_seen_at`, `socket_ids` activos y un historial corto de eventos recientes de conexion/desconexion.
- La inspeccion operativa visible de esta presencia se expone por el endpoint interno `GET /api/pantallas/socket/status`.
- La reproduccion `airplay` opera ahora en modo hibrido: la pantalla solicita contenido una sola vez al conectar y los cambios posteriores de playlist se empujan desde el CMS externo por `POST /api/pantallas/socket/refresh`, protegido con API key interna.
- La regla de asignacion del CMS es exclusiva: cada pantalla debe conservar una sola playlist activa; una nueva asignacion desactiva la anterior con `status_alta = 0` y conserva el registro para historial.
- Como defensa de compatibilidad, `models/pantallas.js` selecciona la relacion activa mas reciente por pantalla cuando existen filas legacy duplicadas, evitando concatenar campañas en el consumidor aunque la limpieza de datos aun este pendiente.
- El refresh push recalcula contenido por `token` conectado y contempla tres casos visibles en codigo: playlist asignada, consumidores de playlist default y pantallas explicitamente afectadas por cambios de asignacion o multimedia. La respuesta separa el procesamiento HTTP (`next`) de la entrega Socket.IO (`delivery_next`, `delivery_status` y `delivery_message`).
- El consumidor `siteweb` no forma parte aun de este flujo push y debe tratarse como alcance separado cuando se retome.
- Pendiente de validacion/evolucion: si esta presencia debe persistirse en base de datos para auditoria, tablero administrativo o alertado formal.
- Cuando el ultimo socket de una pantalla se desconecta, `helpers/sockets.js` notifica el evento mediante callback a `config/server.js`, que lo conecta con `helpers/airplay_notifications.js`.
- La alerta espera 60 segundos por defecto. Si la pantalla se reconecta durante ese periodo, el temporizador se cancela y no se envia el aviso.
- La alerta consulta `cat_whatsapp_types_details` con el detalle `11` por defecto y obtiene desde `name` el identificador tecnico de la plantilla; los telefonos se obtienen de `cat_correosinternos` con `status_alta = 1`.
- El envio se realiza internamente mediante `send_message()` y cada destinatario se registra en `whatsapp_requests`; no se realiza una llamada HTTP al endpoint `/api/whatsapp/send_notification`.
- El contrato actual de la alerta usa tres parametros de cuerpo: `ENCARGADO`, `MONITOREO PANTALLAS` y el mensaje dinamico con el nombre de la pantalla.
- La configuracion opcional `AIRPLAY_DISCONNECT_NOTIFICATION_DETAIL_ID` permite cambiar el detalle sin modificar el helper; `AIRPLAY_DISCONNECT_DELAY_MS` permite ajustar el periodo de gracia.

## Riesgos arquitectonicos
- Alto acoplamiento entre logica HTTP, SQL e integraciones externas.
- Validacion dispersa y no uniforme.
- SQL embebido en multiples modulos.
- Duplicacion de logica en modelos y sockets.
- Configuracion sensible mezclada con codigo.
- Pendiente de validacion: arquitectura real de despliegue y terminacion TLS.
- Pendiente de validacion: confirmar que el detalle activo `11` tiene una plantilla Meta aprobada con tres parametros y que los telefonos almacenados cumplen el formato aceptado por Meta.

## Nota sobre hardware / sensores
- El prefijo `/api/hware` se monta desde `config/server.js` y la ruta `/sensor` acepta `POST` para registrar un evento y `GET` para devolver la configuracion asociada a una MAC.
- El `GET` requiere `?mac=...` porque la configuracion pertenece a un dispositivo especifico; el firmware debe incluir la MAC en cada consulta de configuracion.
- La persistencia actual del `POST /api/hware/sensor` reutiliza `checador_rfid` mediante `models/dispositivos.js`; queda pendiente confirmar que esa tabla sea la adecuada para eventos de conteo de personas.
