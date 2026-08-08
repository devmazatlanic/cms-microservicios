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

### 2026-07-22 - Alertas WhatsApp por desconexion sostenida de pantallas AirPlay
- Objetivo: notificar por WhatsApp cuando el ultimo socket de una pantalla AirPlay permanezca desconectado durante 60 segundos.
- Diagnostico confirmado:
  - `helpers/sockets.js` ya detectaba cuando desaparecia el ultimo socket asociado a un token, pero no ejecutaba ninguna alerta externa.
  - los destinatarios se administran en `cat_correosinternos` mediante `id_whatsapp_type_detail` y la plantilla tecnica se administra en `cat_whatsapp_types_details.name`.
  - el envio existente de WhatsApp permite reutilizar `message_templete()` y `send_message()` con registro en `whatsapp_requests`.
- Cambios aplicados:
  - `models/whatsapp.js` agrega una consulta parametrizada con `LEFT JOIN` para obtener la configuracion activa y los destinatarios activos del detalle seleccionado;
  - `helpers/airplay_notifications.js` programa el aviso, cancela el temporizador cuando la pantalla se reconecta, deduplica telefonos y envia un mensaje por destinatario;
  - `config/server.js` conecta los callbacks de presencia con el helper de alertas;
  - `helpers/sockets.js` dispara el callback solamente cuando se desconecta el ultimo socket de la pantalla y cancela alertas al identificar una reconexion;
  - los metadatos internos guardan token, nombre de pantalla, razon de desconexion, detalle de configuracion y destinatario dentro de la bitacora existente;
  - se agregaron las variables opcionales `AIRPLAY_DISCONNECT_NOTIFICATION_DETAIL_ID` y `AIRPLAY_DISCONNECT_DELAY_MS`, con valores por defecto `11` y `60000`.
- Contrato actual de plantilla:
  - parametro 1 fijo: `ENCARGADO`;
  - parametro 2 fijo: `MONITOREO PANTALLAS`;
  - parametro 3 dinamico: `La pantalla {nombre} se desconectó del socket.`
- Riesgo residual:
  - los temporizadores son volatiles y se pierden al reiniciar Node;
  - aun no hay reintentos ni cola persistente para errores transitorios de Meta;
  - cambiar solo el nombre tecnico de la plantilla no requiere codigo, pero cambiar cantidad, orden o idioma de parametros requiere nueva validacion.
- Validacion tecnica ejecutada:
  - `node --check models/whatsapp.js`;
  - `node --check helpers/airplay_notifications.js`;
  - `node --check helpers/sockets.js`;
  - `node --check config/server.js`.
- Validacion funcional pendiente:
  - confirmar catalogo activo y destinatarios reales;
  - desconectar una pantalla y verificar el log de alerta programada;
  - reconectar antes de 60 segundos y comprobar la cancelacion;
  - mantener la desconexion y comprobar respuesta de Meta y registro en `whatsapp_requests`.

### 2026-07-22 - Correccion de consulta del detalle de plantilla AirPlay
- Hallazgo: la consulta recibia el detalle `11`, pero `Number.parseInt(valor, 11)` lo interpretaba usando base 11 y producia el valor decimal `12`.
- Hallazgo adicional: la consulta usaba `cat_whatsapp_types_details.nombre`, que corresponde al texto visible del catalogo y no al identificador tecnico de Meta.
- Correccion aplicada:
  - se cambio la base numerica a `10`;
  - se cambio la columna consultada a `d.name AS template_name`.
- Impacto: la alerta ahora puede encontrar el detalle decimal `11` y utilizar el nombre tecnico de plantilla configurado en el catalogo.
- Riesgo pendiente: confirmar que el registro `11` este activo, que `name` contenga una plantilla aprobada y que el formato de `phone_number` no genere un prefijo duplicado con el ajuste local `+521`.
- Validacion tecnica ejecutada:
  - `node --check` en los archivos JavaScript involucrados;
  - verificacion directa de que `parseInt('11', 10)` produce `11` y `parseInt('11', 11)` produce `12`;
  - `git diff --check` sin errores.

### 2026-07-23 - Compatibilidad de configuracion para sensor ESP32
- Objetivo: permitir que el ESP32 consulte su distancia maxima configurada sin registrar un evento adicional.
- Diagnostico confirmado:
  - el firmware realiza `POST /api/hware/sensor` al detectar una persona;
  - el firmware realiza `GET /api/hware/sensor` cada 10 segundos, pero la ruta solo tenia `POST`;
  - el servidor necesita la MAC para identificar el dispositivo y devolver su configuracion;
  - la persistencia actual del POST reutiliza `checador_rfid` y recibe unicamente `id_dispositivo_lector`, por lo que su compatibilidad con conteo de personas queda pendiente de validacion.
- Cambios aplicados:
  - `routes/rfid.js` agrega `GET /sensor`;
  - `controllers/rfid.js` agrega `get_sensor_config`, recibe `mac` por query string y devuelve `config` sin insertar registros;
  - la configuracion del POST ahora se valida antes de llamar a `JSON.parse` implicitamente;
  - se agregaron logs operativos para distinguir consulta de configuracion y configuracion JSON invalida.
- Cambio requerido en firmware:
  - el GET debe consultar `serverURL + '?mac=' + macAddress`;
  - el endpoint correcto es `/api/hware/sensor`, no `/api/hware/sendor`.
- Validacion tecnica ejecutada:
  - `node --check controllers/rfid.js`;
  - `node --check routes/rfid.js`;
  - `git diff --check` sin errores.
- Validacion funcional pendiente:
  - probar GET con MAC registrada, inexistente y sin MAC;
  - probar POST y confirmar el insert esperado;
  - confirmar el contenido JSON de `config`, especialmente `maxdistance`;
  - definir autenticacion del dispositivo y persistencia especifica para conteo.

### 2026-07-21 - Asignacion exclusiva de playlist por pantalla
- Objetivo: evitar que una pantalla reproduzca varias campañas por acumulacion de relaciones activas en `scr_pantallas_reproducciones`.
- Diagnostico confirmado:
  - el alta anterior evitaba duplicar solo la pareja exacta playlist/pantalla, pero no desactivaba otras playlists de la misma pantalla;
  - el consumidor Node leia todas las relaciones activas y podia devolver contenido combinado;
  - la activacion manual de una relacion historica podia volver a crear el mismo riesgo.
- Cambios aplicados:
  - `cms-mazatlanic/src/application/models/pantallas_model.php` incorpora `replace_pantallas_reproduccion()`, con transaccion, normalizacion de IDs y conservacion historica mediante `status_alta = 0`;
  - las altas y ediciones de `pantallas_controller.php` usan el reemplazo exclusivo;
  - la activacion manual de relaciones historicas reutiliza la misma operacion para desactivar la playlist vigente antes de activar la seleccionada;
  - `cms-microservicios/models/pantallas.js` selecciona la relacion activa mas reciente por pantalla como defensa ante datos legacy duplicados;
  - se conservaron los mensajes existentes y se agrego `assignment_mode = replace_active_playlist` como dato informativo.
- Riesgo residual:
  - falta validar con datos reales que no existan relaciones activas legacy duplicadas y confirmar el comportamiento visual al cambiar de playlist;
  - la vigencia por fechas y el orden interno de multimedia siguen fuera de esta intervencion.
- Validacion tecnica ejecutada:
  - `php -l` del controlador y modelo de pantallas del CMS;
  - pendiente ejecutar prueba funcional: asignar playlist A, asignar playlist B a la misma pantalla, revisar tabla, reproducción y refresh Socket.IO.

### 2026-07-21 - Compatibilidad de conectividad CMS con Docker y XAMPP
- Objetivo: dejar documentado y soportado que Node se ejecute directamente en el host mientras el CMS cambia entre Docker local y XAMPP productivo.
- Cambio aplicado:
  - el CMS detecta Docker mediante `/.dockerenv` cuando no recibe `MICROSERVICES_BASE_URL`
  - el fallback Docker es `host.docker.internal:3000`
  - el fallback fuera de Docker es `127.0.0.1:3000`
  - la API key continua siendo externa y obligatoria mediante `MICROSERVICES_INTERNAL_API_KEY`
- Riesgo: medio, porque XAMPP requiere configurar la API key en el entorno de Apache y reiniciar el servicio para que PHP la reciba.
- Validacion sugerida:
  - validar Docker local con `docker compose up -d --force-recreate web`
  - validar XAMPP con `SetEnv MICROSERVICES_BASE_URL` y `SetEnv MICROSERVICES_INTERNAL_API_KEY` en el VirtualHost
  - repetir asignacion de playlist y verificar ausencia de advertencias de conectividad o autenticacion

### 2026-07-21 - Diagnostico de conectividad CMS Docker -> microservicio Node
- Objetivo: resolver el error `Failed to connect to localhost port 3000: Connection refused` al notificar el refresh de pantallas desde `cms-mazatlanic`.
- Diagnostico confirmado:
  - `cms-mazatlanic` se ejecuta dentro del contenedor `cms-mazatlanic-web` y publica el puerto `8002`.
  - Node se ejecuta en el host y escucha el puerto `3000`.
  - Desde el contenedor, `localhost:3000` apunta al propio contenedor del CMS y rechaza la conexion.
  - Desde el contenedor, `host.docker.internal:3000` alcanza Node y devuelve `401 NO AUTORIZADO`, confirmando conectividad.
  - `MICROSERVICES_INTERNAL_API_KEY` estaba configurada como una URL, no como la misma clave de `INTERNAL_API_KEY` del microservicio.
- Cambio aplicado:
  - `docker-compose.yml` expone `MICROSERVICES_BASE_URL` y `MICROSERVICES_INTERNAL_API_KEY` al contenedor web.
  - `src/application/config/constants.php` consume esas variables, usa `host.docker.internal:3000` como fallback local de URL y no incluye secretos en codigo.
- Riesgo: medio, porque requiere recrear el contenedor web y configurar la clave real en el entorno Docker. En produccion se debe sustituir `host.docker.internal` por el hostname privado o publico controlado del microservicio.
- Validacion sugerida:
  - definir `MICROSERVICES_INTERNAL_API_KEY` en el `.env` del proyecto `cms-mazatlanic` con el mismo valor de `INTERNAL_API_KEY` del microservicio
  - recrear `cms-mazatlanic-web`
  - verificar desde el contenedor `GET /api/pantallas/socket/status` con la key y esperar HTTP 200
  - asignar una playlist y confirmar que desaparece `refresh_warning`
- Validacion ejecutada:
  - el contenedor reporto `MICROSERVICES_BASE_URL=http://host.docker.internal:3000` y API key configurada sin exponer su valor
  - `GET /api/pantallas/socket/status` respondio HTTP 200 con una pantalla y un socket `airplay` activos
  - `POST /api/pantallas/socket/refresh` respondio HTTP 200 con `total_targets=1`, `total_emitted=1` y `source_type=assigned_playlist`
- Estado: resuelto para Docker local; pendiente de validar la inyeccion equivalente mediante `SetEnv` en XAMPP/Apache productivo.

### 2026-07-22 - Refresh push del flujo `airplay` sin polling continuo
- Objetivo: eliminar la dependencia de polling periodico en la pantalla publica `airplay` y refrescar playlist en cuanto el CMS externo cambie asignaciones, multimedia o playlist default.
- Archivos modificados:
  - `helpers/sockets.js`
  - `controllers/pantallas.js`
  - `routes/pantallas.js`
  - `models/pantallas.js`
  - `../cms-mazatlanic/src/application/controllers/pantallas_controller.php`
  - `../cms-mazatlanic/src/application/models/pantallas_model.php`
  - `../cms-mazatlanic/src/application/views/public/screens/index.php`
  - `../cms-mazatlanic/src/assets/js/js_sockets.js`
  - `docs/ARCHITECTURE.md`
  - `docs/KNOWN_ISSUES.md`
  - `docs/PENDING_ITEMS.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - la pantalla `airplay` deja de consultar playlist por intervalo y ahora hace solo una carga inicial al conectar por Socket.IO
  - se agrego `POST /api/pantallas/socket/refresh` como endpoint interno protegido para forzar refresh de pantallas conectadas
  - el microservicio recompone y emite el evento `response` por `token` conectado, resolviendo playlist asignada, playlist default o ausencia de contenido
  - `cms-mazatlanic` notifica refresh al microservicio al crear, editar o desactivar asignaciones, al modificar multimedia y al cambiar la playlist default
  - se dejo `siteweb` fuera de este alcance para no mezclar consumidores con reglas operativas distintas
- Riesgo: medio, porque la actualizacion inmediata ahora depende de la comunicacion interna CMS -> microservicio; si ese enlace falla, la pantalla conserva el ultimo estado hasta reconexion o recarga.
- Validacion sugerida:
  - abrir `public_controller/pantalla` y confirmar carga inicial de contenido
  - crear o editar una asignacion de playlist a pantalla y validar refresh inmediato sin esperar intervalo
  - agregar, editar o desactivar multimedia de una playlist y confirmar actualizacion en la pantalla conectada
  - cambiar la playlist default y validar refresco de pantallas sin asignacion explicita
  - provocar fallo controlado del endpoint interno o de la API key y confirmar que el CMS responda con advertencia operativa
  - repetir las pruebas en produccion con `MICROSERVICES_BASE_URL` y `MICROSERVICES_INTERNAL_API_KEY` reales
- Validacion tecnica ejecutada en esta fase: carga de modulos Node del microservicio sin error de sintaxis.
- Validacion tecnica ejecutada en esta fase: `php -l` exitoso sobre controlador y modelo modificados en `cms-mazatlanic`.
- Validacion tecnica ejecutada en esta fase: parseo exitoso del cliente `js_sockets.js` del CMS externo.

### 2026-07-21 - Integracion de presencia Socket en catalogo de pantallas del CMS externo
- Objetivo: mostrar el estado real de conexion `airplay` dentro del catalogo administrativo de pantallas en `cms-mazatlanic`, sin mezclarlo con el `STATUS` de alta/inactiva y sin exponer la API key en navegador.
- Archivos modificados:
  - `../cms-mazatlanic/src/application/config/constants.php`
  - `../cms-mazatlanic/src/application/controllers/pantallas_controller.php`
  - `../cms-mazatlanic/src/application/views/pantallas/index_catalogos.php`
  - `../cms-mazatlanic/src/application/views/pantallas/ajax/table_pantallas.php`
  - `../cms-mazatlanic/src/assets/js/pantallas/js_catalogos.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/PENDING_ITEMS.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se agrego la columna `CONEXION` en el catalogo de pantallas del CMS externo
  - el backend PHP del CMS ahora consulta `GET /api/pantallas/socket/status` del microservicio Node usando `MICROSERVICES_BASE_URL` y `MICROSERVICES_INTERNAL_API_KEY`
  - la vista inicial y el parcial AJAX renderizan `CONECTADA`, `DESCONECTADA` o `SIN DATOS` sin alterar el `STATUS` administrativo existente
  - el JS del catalogo refresca la presencia cada 30 segundos mientras la pestaña `PANTALLAS` esta activa
  - la integracion degrada a `SIN DATOS` si la credencial interna no esta configurada o si el microservicio no responde
- Riesgo: medio, porque introduce una dependencia operativa entre dos aplicaciones y requiere configuracion consistente de ambiente para mostrar el estado real.
- Validacion sugerida:
  - configurar `MICROSERVICES_INTERNAL_API_KEY` en el entorno de `cms-mazatlanic`
  - abrir `pantallas_controller/index_catalogos` y revisar la columna `CONEXION`
  - conectar y desconectar una pantalla `airplay` y confirmar actualizacion del badge sin recargar la pagina
  - validar degradacion controlada a `SIN DATOS` si se remueve temporalmente la credencial o se detiene el microservicio

### 2026-07-21 - Observabilidad inicial del flujo Socket `airplay`
- Objetivo: detectar conexion, ultimo heartbeat y desconexion de pantallas `airplay`, dejando una inspeccion interna sin tocar aun el flujo `siteweb`.
- Archivos modificados:
  - `helpers/sockets.js`
  - `controllers/pantallas.js`
  - `routes/pantallas.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/ARCHITECTURE.md`
  - `docs/REPO_MAP.md`
  - `docs/PENDING_ITEMS.md`
  - `../cms-mazatlanic/src/assets/js/js_sockets.js`
- Cambio aplicado:
  - el cliente `airplay` ahora envia un primer `emit` inmediato al conectar y conserva el refresco periodico existente
  - el handshake del cliente envia tambien el tipo logico de socket
  - el microservicio registra presencia `airplay` en memoria por `token`, `socket_id`, `connected_at` y `last_seen_at`
  - se registra `disconnect` con razon y se mantiene un historial corto en memoria de eventos recientes de conexion/desconexion
  - se agrego `GET /api/pantallas/socket/status` como endpoint interno protegido por API key para inspeccion operativa del estado actual
- Riesgo: medio, porque el flujo ahora depende de una coordinacion explicita entre el cliente externo `cms-mazatlanic` y el microservicio, y la presencia sigue siendo volatil ante reinicios del proceso Node.
- Validacion sugerida:
  - abrir una pantalla `airplay` y confirmar carga inicial sin esperar el primer intervalo
  - revisar consola del navegador y del microservicio al conectar
  - cerrar la pestaña o interrumpir la red y confirmar evento de desconexion en el microservicio
  - consultar `GET /api/pantallas/socket/status` con `x-api-key` valida para verificar presencia activa y `recent_events`
  - reabrir la pantalla y confirmar reconexion con nuevo evento en historial

### 2026-03-30 - Adaptador defensivo para modelos legacy MySQL
- Objetivo: evitar fallas de runtime cuando `databases/config.js` no expone `connection` con el contrato esperado por los modelos legacy.
- Archivos modificados:
  - `helpers/db_connection.js`
  - `models/autorizaciones.js`
  - `models/codigoqrs.js`
  - `models/dispositivos.js`
  - `models/eventos.js`
  - `models/notificaciones.js`
  - `models/pantallas.js`
  - `models/perfiles.js`
  - `models/reportes.js`
  - `models/tarjetas.js`
  - `models/tipo_dispositivos.js`
- Cambio aplicado:
  - se agrego un adaptador `connection.query(...)` compatible con exportaciones tipo `connection`, `query` o pool directo
  - los modelos legacy ahora dependen de un punto unico de compatibilidad
  - `controllers/web.js` ahora responde `500` controlado si falla la lectura de eventos
- Riesgo: bajo a medio, por tratarse de una capa compartida de acceso a base de datos.
- Validacion sugerida:
  - carga local de los modelos legacy
  - prueba real de `GET /api/web/events/today`
  - prueba real de un endpoint adicional legacy que use `connection.query(...)`

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

### 2026-03-26 - Validacion operativa inicial de WhatsApp en entorno real
- Objetivo: confirmar en ambiente real el funcionamiento de `send_notification`, sincronizacion de `statuses`, flujo de `context.id` y menu/bot inicial.
- Archivos revisados:
  - `controllers/whatsapp.js`
  - `helpers/tools.js`
  - `helpers/whatsapp.js`
  - `models/whatsapp.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/PENDING_ITEMS.md`
  - `docs/MAINTENANCE_LOG.md`
- Resultado observado:
  - las plantillas probadas desde Postman respondieron correctamente
  - el webhook y la bitacora local mostraron funcionamiento correcto en pruebas reales
  - el menu/bot inicial quedo operativo en ambiente real
  - los `console.log` se mantuvieron activos para continuar observacion controlada
- Decision:
  - se retiran de pendientes las validaciones ya confirmadas de `send_notification`, carga de `WHATSAPP_*`, sincronizacion basica de `statuses` y menu inicial
  - el siguiente frente activo queda en evolucion del bot sobre la base ya validada

### 2026-03-26 - Endurecimiento inicial de configuracion SMTP
- Objetivo: retirar dependencia hardcodeada del proveedor SMTP y dejar `config/mail.js` listo para cambio de relay por ambiente.
- Archivos modificados:
  - `config/mail.js`
  - `.env`
  - `docs/README.md`
  - `docs/PROJECT_CONTEXT.md`
  - `docs/ARCHITECTURE.md`
  - `docs/SETUP.md`
  - `docs/KNOWN_ISSUES.md`
  - `docs/PENDING_ITEMS.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - `config/mail.js` ahora usa configuracion `MAIL_*` para host, puerto, credenciales, TLS, pool, throttling y timeouts
  - el transporte SMTP se inicializa de forma perezosa en el primer envio real
  - se dejo logging explicito cuando faltan variables de correo y cuando el transporte se inicializa
  - se agrego plantilla comentada de variables `MAIL_*` en `.env` para referencia operativa sin introducir nuevos secretos en codigo
  - se actualizo la documentacion para reflejar que el proveedor SMTP ya es intercambiable por ambiente
- Riesgo: medio, porque los flujos activos de correo ahora dependen de que `MAIL_*` exista correctamente en el ambiente productivo.
- Validacion sugerida:
  - cargar `config/mail.js`
  - cargar `controllers/ingresos.js` y `controllers/web.js`
  - probar envio real desde `ingresos` y `web`
  - confirmar configuracion SPF, DKIM y DMARC del dominio remitente
- Nota operativa:
  - este endurecimiento reduce acoplamiento y permite migrar a un proveedor transaccional dedicado, pero no elimina por si mismo bloqueos de reputacion o umbrales del relay actual.

### 2026-03-27 - Alineacion inicial de `.env` para pruebas con GoDaddy/cPanel
- Objetivo: dejar una configuracion SMTP consistente para la primera ventana de pruebas reales con el correo del hosting de GoDaddy.
- Archivos modificados:
  - `.env`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se alineo `MAIL_PORT=465` con `MAIL_SECURE=true`
  - se definio `MAIL_REQUIRE_TLS=false` para la prueba inicial por SSL implicito
  - se activaron explicitamente opciones de TLS, pool, throttling y timeouts
  - se alinearon `MAIL_FROM_*` y `MAIL_CC_*` temporalmente a la misma cuenta autenticada para reducir rechazos por mezcla de dominios o remitentes
- Riesgo: medio, porque la prueba sigue dependiendo de que el relay de GoDaddy acepte la cuenta y de la reputacion/configuracion del dominio.
- Validacion sugerida:
  - reiniciar el servicio
  - ejecutar una prueba de envio controlada
  - revisar consola para handshake SMTP, autenticacion y respuesta del relay
  - si la prueba pasa, separar despues remitentes y copias reales de negocio

### 2026-03-27 - Endpoint interno para correo simple transaccional
- Objetivo: habilitar un endpoint reutilizable para notificaciones simples con plantilla empresarial, sin reactivar el modulo legacy de `notificaciones`.
- Archivos modificados:
  - `config/server.js`
  - `config/mail.js`
  - `config/plantillas.js`
  - `controllers/mail.js`
  - `routes/mail.js`
  - `views/emails/simple_notification.hbs`
  - `docs/README.md`
  - `docs/PROJECT_CONTEXT.md`
  - `docs/REPO_MAP.md`
  - `docs/ARCHITECTURE.md`
  - `docs/SETUP.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se creo la ruta `POST /api/mail/simple`
  - el endpoint valida `to`, `name` y `comment` como campos obligatorios
  - se agrego una plantilla corporativa simple para mensajes transaccionales breves
  - el nuevo flujo reutiliza el transporte SMTP ya endurecido y permite `subject` y `cc` opcionales
- Riesgo: medio, porque agrega un endpoint con side effect real y depende de control de acceso a nivel de red/aplicacion.
- Validacion sugerida:
  - enviar un correo simple por Postman
  - revisar respuesta HTTP
  - revisar consola para confirmacion SMTP
  - confirmar recepcion en bandeja o spam del destinatario

### 2026-03-27 - Ajuste visual de plantilla para correo simple
- Objetivo: refinar la presentacion del correo simple y retirar textos de cierre no deseados.
- Archivos modificados:
  - `views/emails/simple_notification.hbs`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se agrego una etiqueta superior discreta para reforzar identidad visual
  - se ajusto la jerarquia tipografica del titulo principal
  - se elimino la linea de seguimiento adicional del cuerpo
  - se elimino el enlace `Sitio Web` del footer
- Riesgo: bajo, acotado a la apariencia del correo simple.
- Validacion sugerida:
  - reenviar una prueba por `POST /api/mail/simple`
  - confirmar visualmente encabezado, cuerpo y footer actualizados

### 2026-03-27 - Refinamiento visual hacia formato de comunicado oficial
- Objetivo: hacer mas sobrio el correo simple, reduciendo repeticion de marca y mejorando jerarquia del titulo.
- Archivos modificados:
  - `views/emails/simple_notification.hbs`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - el `subject` ahora se presenta visualmente en mayusculas
  - se retiro la marca adicional del encabezado
  - la firma de marca se movio al footer, debajo de `Atentamente`
  - se mantuvo una sola presencia fuerte de marca en el header mediante el logo
- Riesgo: bajo, acotado a la presentacion del correo simple.
- Validacion sugerida:
  - reenviar una prueba por `POST /api/mail/simple`
  - confirmar que el titulo aparezca en mayusculas y que la firma visual quede al final

### 2026-03-27 - Registro de backlog tecnico pendiente
- Objetivo: dejar visibles como pendientes los siguientes frentes para retomarlos despues sin perder contexto.
- Archivos modificados:
  - `docs/PENDING_ITEMS.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se mantuvo pendiente la proteccion de `/api/mail/simple`
  - se agrego explicitamente la separacion futura entre `info@...` y `no-reply@...`
  - se conserva como pendiente activo la fase 2 del bot de WhatsApp
  - se mantiene pendiente el rediseño o reemplazo formal del modulo de notificaciones/correo legado
- Riesgo: bajo, documental.

### 2026-03-27 - Fase 1 de seguridad perimetral e interna
- Objetivo: corregir CORS efectivo, preparar soporte de proxy/HTTPS y proteger endpoints internos confirmados con API key.
- Archivos modificados:
  - `config/server.js`
  - `routes/mail.js`
  - `routes/whatsapp.js`
  - `helpers/internal_api_key.js`
  - `.env`
  - `docs/README.md`
  - `docs/PROJECT_CONTEXT.md`
  - `docs/REPO_MAP.md`
  - `docs/ARCHITECTURE.md`
  - `docs/SETUP.md`
  - `docs/KNOWN_ISSUES.md`
  - `docs/PENDING_ITEMS.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - se dejo una sola politica CORS para HTTP, con normalizacion de origenes y eliminacion del comportamiento abierto por `cors()`
  - se agregaron headers basicos de seguridad y limite al `json` body
  - se incorporo soporte configurable para `trust proxy`, redireccion o exigencia de HTTPS y opcion de HTTPS local solo por bandera
  - se deshabilito por defecto la ruta diagnostica `/ipdevice`
  - se protegieron con API key los endpoints internos confirmados:
    - `/api/mail/simple`
    - `/api/whatsapp/send_notification`
- Riesgo: medio, porque los clientes internos ahora deben enviar `x-api-key` o `Authorization: Bearer ...`, y la activacion final de HTTPS depende del entorno productivo.
- Validacion sugerida:
  - probar `/api/mail/simple` sin API key y con API key
  - probar `/api/whatsapp/send_notification` sin API key y con API key
  - validar desde navegador un origen permitido y uno no permitido
  - validar en produccion cabecera `x-forwarded-proto` antes de activar `APP_FORCE_HTTPS`

### 2026-08-08 - Identidad canonica y observabilidad del refresh AirPlay
- Objetivo: preparar una validacion mas confiable del refresh de playlists sin romper las pantallas que aun utilizan el flujo historico.
- Archivos modificados:
  - `controllers/pantallas.js`
  - `helpers/sockets.js`
  - `docs/KNOWN_ISSUES.md`
  - `docs/ARCHITECTURE.md`
  - `docs/MAINTENANCE_LOG.md`
- Cambio aplicado:
  - el endpoint `POST /api/pantallas/socket/refresh` conserva `next: true` para compatibilidad con el transporte existente;
  - se agregaron `delivery_next`, `delivery_status` y `delivery_message` para distinguir `no_targets`, `no_connected_sockets`, `partial` y `emitted`;
  - Node registra explicitamente cuando un token solicitado no tiene sockets conectados;
  - se documenta el uso del token canonico de pantalla y el fallback historico por `localStorage`.
- Riesgo: medio, porque las pantallas que no reciban `?token=...` continuan dependiendo del identificador generado previamente por el navegador.
- Validacion sugerida:
  - consultar `/api/pantallas/socket/status` y confirmar el token de la pantalla;
  - ejecutar una asignacion con la pantalla conectada;
  - confirmar `total_targets = 1`, `total_emitted = 1`, `delivery_next = true` y `delivery_status = emitted`;
  - repetir con la pantalla desconectada y confirmar `delivery_next = false` y `delivery_status = no_connected_sockets`.

### 2026-08-08 - Verificacion del backend de playlist AirPlay
- Objetivo: separar un posible fallo de consulta/emision Node de un fallo de render en el navegador CMS.
- Validacion ejecutada con el token de prueba conectado:
  - la consulta `getPlaylisPantallabyToken()` devolvio una playlist activa (`id_reproduccion = 2`) con un elemento multimedia `mp4`;
  - `POST /api/pantallas/socket/refresh` respondio HTTP 200;
  - `delivery_next = true`, `delivery_status = emitted`, `total_targets = 1`, `total_emitted = 1` y `total_connected = 1`;
  - Node registro el refresh y no se identifico un fallo en la lectura de la playlist ni en la entrega al socket.
- Conclusion: la correccion siguiente corresponde al cliente AirPlay del CMS, no a la consulta SQL ni al endpoint Node.
- Pendiente: validar visualmente que el navegador procese el evento `response` y reemplace la playlist sin recarga.

### 2026-08-08 - Aislamiento de conectividad CMS Docker -> Node
- Objetivo: confirmar si el microservicio Node era responsable de que la pantalla no recibiera la playlist nueva.
- Evidencia:
  - `getPlaylisPantallabyToken()` devolvio la playlist activa esperada para el token de prueba;
  - `POST /api/pantallas/socket/refresh` respondio `delivery_next = true` y `delivery_status = emitted`;
  - una pantalla conectada recibio el evento `response` y mantuvo en el DOM el archivo de la playlist activa;
  - desde el contenedor del CMS, `localhost:3000` no pudo conectarse;
  - desde el mismo contenedor, `host.docker.internal:3000` alcanzo Node correctamente.
- Conclusion: no se detecto un fallo en la consulta Node ni en la emision Socket.IO. La causa pendiente se encuentra en la URL estatica que utiliza el helper del CMS para notificar el refresh.
- Accion pendiente en el repositorio CMS: consumir `MICROSERVICES_BASE_URL` y `MICROSERVICES_INTERNAL_API_KEY` desde `send_endpoint()`.
