# Maintenance Log

## Uso de este archivo
- Conservar aqui el historial de intervenciones tecnicas realizadas sobre el proyecto.
- No eliminar entradas cerradas; agregar nuevas intervenciones con fecha, alcance y validacion sugerida.
- Usarlo como referencia para diagnostico de bugs, rollback funcional y plan de mejoras futuras.

## Fecha del analisis
2026-03-25

## Hallazgos iniciales
- Se identifico un servicio Node.js/Express con Socket.IO y MySQL.
- El repositorio contiene modulos de correo, WhatsApp, RFID, pantallas y web publica.
- Se detectaron secretos sensibles en codigo y artefactos versionados.
- Se detecto una inconsistencia importante entre el acceso a base de datos esperado por modelos y la configuracion local observada.

## Modulos revisados
- servidor y bootstrap
- configuracion
- rutas
- controladores
- modelos
- helpers
- plantillas de correo

## Riesgos encontrados
- seguridad de secretos
- configuracion no trazable
- bugs de runtime en WhatsApp
- contratos HTTP fragiles
- ausencia de pruebas automatizadas
- duplicacion de logica

## Acciones sugeridas
1. Confirmar entorno real de ejecucion.
2. Documentar contratos y variables efectivas.
3. Corregir bugs confirmados de alta prioridad.
4. Rotar y externalizar secretos.
5. Crear documentacion incremental por modulo.
6. Incorporar pruebas de humo minimas.

## Proximos pasos
- validar setup real del proyecto
- documentar endpoints y flujos por modulo
- priorizar remediacion de issues criticos
- preparar base para modernizacion progresiva

## Estado
Documento inicial generado a partir del codigo visible.
Todo lo no confirmado debe tratarse como pendiente de validacion.

## Intervenciones

### 2026-03-25 - Estabilizacion inicial del flujo WhatsApp
- Objetivo: corregir dos fallas de runtime en `helpers/tools.js`.
- Archivos modificados:
  - `helpers/tools.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se reemplazo una referencia invalida a `response.sendStatus(...)` por retorno seguro de modelo vacio
  - se corrigio la variable usada para leer mensajes `interactive`
- Riesgo: bajo, acotado al helper de procesamiento del webhook.
- Validacion sugerida:
  - mensaje `interactive` recibido por webhook
  - mensaje con `context.id` inexistente en almacenamiento local
  - confirmacion de respuesta HTTP 200 sin envio saliente no deseado

### 2026-03-25 - Alineacion inicial de la capa MySQL
- Objetivo: corregir el contrato inconsistente entre `databases/config.js` y los modelos.
- Archivos modificados:
  - `databases/config.js`
  - `models/perfiles.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/MAINTENANCE_LOG.md`
  - `docs/ARCHITECTURE.md`
- Cambio aplicado:
  - se expuso `connection: pool` sin remover `query()` ni `close()`
  - se agregaron opciones basicas de espera y timeout al pool
  - se retiro el uso invalido de `connection.connect()` en `models/perfiles.js`
- Riesgo: bajo a medio, por tratarse de una pieza compartida por multiples modelos.
- Validacion sugerida:
  - carga local de `databases/config.js`
  - verificacion de `connection.query(...)`
  - prueba integrada con consultas reales a MySQL

### 2026-03-25 - Limpieza del endpoint de perfiles
- Objetivo: eliminar un side effect de correo no sustentado en `GET /api/perfiles`.
- Archivos modificados:
  - `controllers/perfiles.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se elimino la importacion de `enviarCorreo`
  - se elimino la llamada a correo posterior a `response.json(...)`
- Riesgo: bajo, acotado al endpoint de perfiles.
- Validacion sugerida:
  - carga local del controlador
  - consulta real a `GET /api/perfiles`
  - confirmacion funcional de que no existe dependencia externa del correo removido

### 2026-03-25 - Desactivacion temporal del modulo de notificaciones
- Objetivo: detener los envios del servicio actual de correo desde `/api/notificaciones/*`.
- Archivos modificados:
  - `routes/notificaciones.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/MAINTENANCE_LOG.md`
  - `docs/REPO_MAP.md`
  - `docs/PENDING_ITEMS.md`
- Cambio aplicado:
  - se mantuvieron las rutas montadas
  - los endpoints de notificaciones ahora responden `410 Gone`
  - se creo un archivo vivo de pendientes para seguimiento incremental
- Riesgo: bajo a medio, dependiendo de si aun existen consumidores activos del modulo.
- Validacion sugerida:
  - llamada real a `/api/notificaciones`
  - llamada real a `/api/notificaciones/solicitudcancelacion`
  - llamada real a `/api/notificaciones/solicitudautorizacion`
  - llamada real a `/api/notificaciones/enviar_reporte_bancos`
  - confirmacion de codigo `410`

### 2026-03-25 - Endurecimiento inicial del servicio de WhatsApp
- Objetivo: mejorar confiabilidad del envio, preparar el camino para bot y retirar una plantilla legacy obsoleta.
- Archivos modificados:
  - `controllers/whatsapp.js`
  - `helpers/whatsapp.js`
  - `helpers/tools.js`
  - `models/whatsapp.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/PENDING_ITEMS.md`
  - `docs/MAINTENANCE_LOG.md`
  - `docs/ARCHITECTURE.md`
  - `docs/PROJECT_CONTEXT.md`
- Cambio aplicado:
  - `send_notification` ahora espera el resultado real de Meta
  - la respuesta JSON conserva `next` y `message`, anexando metadatos del proveedor
  - se registran mensajes entrantes sin `context.id` o con contexto no encontrado en `whatsapp_requests`
  - se retiro la plantilla legacy `ordenservicio` del flujo automatico
- Riesgo: medio, por cambio de contrato ampliado en integracion interna y mayor acoplamiento con resultados reales de Meta.
- Validacion sugerida:
  - envio exitoso real por `/api/whatsapp/send_notification`
  - rechazo real de Meta con respuesta HTTP acorde
  - mensaje entrante sin `context.id`
  - mensaje entrante con `context.id` inexistente en bitacora

### 2026-03-25 - Externalizacion inicial de configuracion de WhatsApp
- Objetivo: retirar del codigo la configuracion critica hardcodeada del modulo de WhatsApp.
- Archivos modificados:
  - `.env`
  - `controllers/whatsapp.js`
  - `helpers/whatsapp.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/PENDING_ITEMS.md`
  - `docs/SETUP.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se movio `VERIFY_TOKEN` a `WHATSAPP_VERIFY_TOKEN`
  - se movieron bearer token y `phone-number-id` a variables `WHATSAPP_*`
  - el helper ahora construye el path de Meta a partir de configuracion externa
- Riesgo: bajo a medio, por dependencia de carga correcta de `.env` en todos los ambientes.
- Validacion sugerida:
  - verificar webhook `GET /api/whatsapp`
  - verificar envio real por `/api/whatsapp/send_notification`
  - confirmar lectura correcta de variables `WHATSAPP_*`

### 2026-03-25 - Endurecimiento del contrato de send_notification
- Objetivo: hacer mas predecible y validable el contrato de `POST /api/whatsapp/send_notification`.
- Archivos modificados:
  - `controllers/whatsapp.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/PENDING_ITEMS.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se normalizan strings y arreglos de entrada
  - se restringe `type` a `text`, `document` y `template`
  - se validan campos requeridos contra el body normalizado
  - se preservan los codigos reales de error al responder
- Riesgo: medio, por posible dependencia del consumidor interno en el contrato anterior mas permisivo.
- Validacion sugerida:
  - envio de `text`
  - envio de `document`
  - envio de `template`
  - envio con `type` invalido
  - rechazo real de Meta verificando el codigo HTTP devuelto

### 2026-03-25 - Clasificacion inicial del flujo entrante por context.id
- Objetivo: dejar mas trazable el webhook entrante de WhatsApp y preparar base para futura automatizacion o bot.
- Archivos modificados:
  - `helpers/tools.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/PENDING_ITEMS.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se normaliza el texto recibido antes de evaluar respuestas
  - se clasifican explicitamente mensajes sin `context.id`, con `context.id` no encontrado y con `context.id` resuelto
  - ahora tambien se almacenan los mensajes entrantes cuyo contexto si pudo resolverse
  - el modelo guardado en bitacora incluye metadatos `_audit` con texto extraido y resultado de resolucion de contexto
- Riesgo: medio, por tratarse de un flujo sensible de webhook y por el aumento en registros de mensajes entrantes almacenados.
- Validacion sugerida:
  - mensaje entrante sin `context.id`
  - mensaje entrante con `context.id` inexistente
  - mensaje entrante con `context.id` valido para `ordenservicio_reenvio`
  - confirmacion de almacenamiento correcto en `whatsapp_requests`

### 2026-03-25 - Instrumentacion inicial del webhook de WhatsApp
- Objetivo: hacer visible en consola si el webhook recibe `messages`, `statuses` o un payload no procesado.
- Archivos modificados:
  - `controllers/whatsapp.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se agrego logging resumido para `statuses` recibidos desde Meta
  - se agrega conteo de mensajes cuando `value.messages` llega como arreglo
  - se registra explicitamente cuando el webhook no trae `messages` ni `statuses` procesables
- Riesgo: bajo, porque no cambia contratos ni logica de negocio; solo visibilidad operativa.
- Validacion sugerida:
  - envio saliente que produzca `statuses`
  - mensaje entrante desde WhatsApp al numero business
  - verificacion de logs cuando el payload no cae en ninguna de las ramas esperadas

### 2026-03-25 - Sincronizacion inicial de statuses de Meta
- Objetivo: actualizar `message_status` en `whatsapp_requests` cuando Meta notifique cambios de estado por webhook.
- Archivos modificados:
  - `models/whatsapp.js`
  - `controllers/whatsapp.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/PENDING_ITEMS.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se agrego una funcion de modelo para actualizar `message_status` por `id_message`
  - el webhook ahora sincroniza `statuses` recibidos desde Meta hacia la bitacora local
  - se registra en consola si el estado se actualizo o si no existio coincidencia en `whatsapp_requests`
- Riesgo: bajo a medio, por tratarse de una actualizacion sobre la bitacora compartida y depender de que `id_message` exista previamente.
- Validacion sugerida:
  - envio saliente real por `/api/whatsapp/send_notification`
  - recepcion posterior de `statuses` de Meta
  - verificacion en base de datos de transicion de `accepted` a `sent`, `delivered`, `read` o error

### 2026-03-25 - Soporte inicial para webhooks agrupados de Meta
- Objetivo: evitar perdida de eventos cuando Meta agrupe multiples `entry`, `changes`, `messages` o `statuses` en un solo payload.
- Archivos modificados:
  - `controllers/whatsapp.js`
  - `docs/README.md`
  - `docs/PROJECT_CONTEXT.md`
  - `docs/REPO_MAP.md`
  - `docs/ARCHITECTURE.md`
  - `docs/KNOWN_ISSUES.md`
  - `docs/PENDING_ITEMS.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - el webhook ahora recorre todos los `entry` y todos los `changes` recibidos
  - se procesan todos los `statuses` presentes en cada cambio
  - se procesan todos los `messages` presentes en cada cambio
  - se conserva respuesta HTTP `200` y logging explicito cuando un `entry` o `change` no contiene ramas procesables
- Riesgo: medio, por tratarse del flujo central del webhook de WhatsApp, aunque el cambio se limito a iteracion y reutiliza la logica existente.
- Validacion sugerida:
  - payload con un solo `message`
  - payload con multiples `messages`
  - payload con multiples `changes`
  - payload mixto con `messages` y `statuses`

### 2026-03-25 - Flujo inicial de menu/bot para WhatsApp
- Objetivo: responder de forma controlada a mensajes sin `context.id`, con contexto desconocido o asociados al propio menu del bot.
- Archivos modificados:
  - `helpers/tools.js`
  - `helpers/whatsapp.js`
  - `docs/PENDING_ITEMS.md`
  - `docs/PROJECT_CONTEXT.md`
  - `docs/ARCHITECTURE.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se agrego un menu textual basico para el canal de WhatsApp sin inventar procesos de negocio fuera de los visibles
  - los mensajes sin `context.id` ahora se almacenan y pueden recibir respuesta de menu o estado
  - los mensajes con `context.id` desconocido ahora devuelven una guia breve junto con el menu
  - las respuestas al propio menu del bot ya pueden volver a mostrar ayuda o confirmar que el canal esta activo
  - `send_message` ahora acepta un formato controlado con metadatos internos para identificar mensajes del bot en la bitacora
- Riesgo: medio, por introducir nuevas respuestas automaticas en un canal productivo, aunque acotadas a ayuda operativa y con logs visibles para observacion.
- Validacion sugerida:
  - mensaje sin `context.id` con texto libre
  - mensaje sin `context.id` con `MENU`
  - mensaje sin `context.id` con `ESTADO`
  - respuesta al propio mensaje del menu
  - confirmacion en `whatsapp_requests` de nombres internos `bot_menu` y `bot_status`
