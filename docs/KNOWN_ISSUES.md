# Known Issues

Este archivo concentra issues, riesgos, deuda tecnica y pendientes activos.
El historial de cambios aplicados se conserva en `MAINTENANCE_LOG.md`.

## Correcciones recientes pendientes de validacion
- 2026-07-22: se corrigio la consulta de configuracion de alertas AirPlay que interpretaba el detalle `11` con base numerica `11` y consultaba el registro `12`; tambien se corrigio la columna de plantilla de `nombre` a `name`. Falta confirmar el comportamiento con la base de datos real y reiniciar Node para cargar el cambio.
- 2026-07-23: se agrego `GET /api/hware/sensor?mac=...` para atender la consulta de configuracion del ESP32 sin registrar eventos. Falta actualizar el firmware y probarlo con el dispositivo real.
- 2026-08-16: se implemento el registro de `POST /api/web/events/contactus` en `tcr_seguimientos`, con modo de contacto dinamico, modo `6` por defecto, reutilizacion del hilo activo y notificacion al Director Comercial. Falta validar contra la base real, el inbox, correo y Meta.

## Prioridad Alta
- Secretos sensibles detectados en codigo o repositorio:
  SMTP, `.env`, certificados y configuraciones que aun requieren estrategia segura por ambiente.
- El modulo de correo ya puede configurarse por entorno, pero sigue pendiente definir un proveedor SMTP/transaccional productivo con mejor entregabilidad y menor riesgo de bloqueo que un relay de buzon generalista.
- El endpoint publico `/api/web/events/contactus` sigue sin controles anti-abuso visibles como rate limit, captcha u otra verificacion de origen humano.
- La estrategia final de HTTPS en produccion sigue pendiente de activacion y validacion en el hosting/proxy.
- El endpoint publico de leads ahora escribe directamente en el inbox CRM y requiere controles anti-abuso antes de exponerlo ampliamente; la ausencia de rate limit/captcha sigue activa.

## Prioridad Media
- `controllers/pantallas.js` usa `GET` leyendo `request.body`.
- Descarga de adjuntos por URL en correo: posible superficie SSRF y escritura temporal local.
- `controllers/ingresos.js` responde al cliente antes de confirmar el envio del correo, y el helper `mail_enviar_recibodeingreso` no propaga fallo hacia el controlador.
- Logica socket duplicada entre `controllers/pantallas.js` y `helpers/sockets.js`.
- La presencia `airplay` se mantiene solo en memoria del proceso Node; si el servicio reinicia, se pierde el estado online/offline y el historial reciente de conexiones.
- El endpoint `POST /api/pantallas/socket/refresh` conserva `next: true` como confirmacion de procesamiento HTTP, pero ahora expone `delivery_next`, `delivery_status` y `delivery_message` para distinguir una emision real de un refresh sin sockets conectados; falta validar el comportamiento con pantallas en distintos estados de conexion.
- El alta automatica de pantallas desde el flujo `airplay` sigue desalineada con el modelo actual: `helpers/sockets.js` intenta crear por `token`, mientras `models/pantallas.js` inserta `nombre`, `host` y `token`.
- La pantalla publica puede recibir un token canonico mediante la URL `?token=...`; las URLs que no lo incluyen conservan el fallback historico basado en `localStorage`. Falta migrar y validar las URLs operativas para evitar identidades distintas entre `scr_pantallas` y el navegador.
- Validacion 2026-08-08: Node consulta la playlist activa y emite el refresh correctamente cuando existe un socket conectado. El fallo pendiente se ubica en el helper del CMS cuando intenta alcanzar Node desde Docker mediante `localhost:3000`.
- `cms-mazatlanic/src/application/helpers/tools_helper.php` sigue consumiendo microservicios con IP interna y fallback hardcodeado de `x-api-key` en flujos legacy de correo y WhatsApp; el nuevo catalogo de pantallas ya no replica ese patron, pero la deuda tecnica permanece activa.
- Pendiente de validacion: el flujo `airplay` no define orden explicito de reproduccion en `models/pantallas.js`; `getPlaylisPantallabyToken()` y `getDefaultPlaylist()` dependen del orden natural de MySQL.
- Pendiente de validacion: las condiciones de vigencia por fecha de playlist en `models/pantallas.js` siguen comentadas, por lo que una pantalla podria recibir contenido fuera de ventana si el dato permanece activo.
- Pendiente de validacion: pueden existir relaciones historicas legacy con `status_alta = 1` repetidas para una misma pantalla. Las nuevas altas, ediciones y reactivaciones ya aplican reemplazo exclusivo, y el consumidor Node usa la relacion activa mas reciente como respaldo; falta auditar y normalizar los datos existentes.
- La alerta de desconexion AirPlay mantiene sus temporizadores en memoria; si Node se reinicia durante los 60 segundos de gracia, ese aviso no se recupera.
- El nombre de la plantilla se consulta dinamicamente desde `cat_whatsapp_types_details.name`, pero la alerta mantiene un contrato de tres parametros y el idioma `es` en codigo; cambiar cantidad, orden o idioma requiere validacion adicional.
- La deduplicacion del endpoint de leads usa correo o telefono y considera variantes mexicanas del telefono, pero no existe una llave de idempotencia para solicitudes simultaneas; dos peticiones concurrentes podrian abrir hilos duplicados.
- Si no existe un Director Comercial activo (`usu_idPuesto = 5`), el lead se persiste sin responsable y la notificacion queda omitida; falta confirmar que el inbox lo muestre para los perfiles administradores.
- La notificacion de leads usa `notify_operativo_general` directamente en el helper; si la plantilla cambia de nombre o cantidad de parametros, requiere una validacion o parametrizacion futura.

## Prioridad Baja
- Codigo comentado abundante y logs directos en produccion.
- Duplicacion casi literal entre `models/autorizaciones.js` y `models/notificaciones.js`.
- Ruta `routes/helpers.js` detectada pero no montada en el servidor.
- No se detectaron pruebas automatizadas ni documentacion base.

## Deuda tecnica
- SQL embebido por modulo.
- Conviven dos estilos de acceso a MySQL: `connection.query(...)` legacy y `db.query(...)` basado en Promise.
- Ausencia de capa de servicios.
- Falta de tipado/contratos explicitos.
- Falta de estrategia visible de manejo de errores.
- Trazabilidad limitada del entorno real.
- `config/mail.js` mezcla responsabilidades de transporte SMTP, render de plantillas, descarga de adjuntos, retry y politicas basicas de throttling.
- La automatizacion entrante de WhatsApp sigue acoplada a plantillas concretas y aun no existe una capa de enrutamiento conversacional para futuro bot o menu.
- La sincronizacion de `statuses` de WhatsApp actualiza `message_status`, pero aun no persiste el payload completo del status ni metadatos adicionales de entrega o error.
- La alerta interna de desconexion envia un mensaje por destinatario y registra el resultado en `whatsapp_requests`, pero aun no cuenta con reintentos ni una cola persistente para fallos transitorios de Meta.
- El alta de leads registra primero en CRM y ejecuta correo/WhatsApp despues; no existe una cola/outbox persistente para reintentar side effects fallidos sin repetir manualmente la solicitud.
- `models/eventos.js` concentra SQL, normalizacion y reglas de deduplicacion del inbox; debe extraerse progresivamente a una capa de servicio cuando el contrato se estabilice.
- `POST /api/hware/sensor` reutiliza la insercion de `checador_rfid` aunque el evento del ESP32 no proporciona perfil ni tarjeta; falta confirmar que el esquema acepte ese uso o separar los eventos de conteo en una persistencia propia.

## Hallazgos pendientes de validar
- Configuracion de base de datos real en produccion.
- Confirmar que el `databases/config.js` efectivo en produccion coincide con la implementacion corregida en este repositorio.
- Confirmar que no existan consumidores activos de `/api/notificaciones/*` tras la desactivacion temporal.
- Validar en entorno real el comportamiento del webhook cuando lleguen multiples mensajes o multiples `changes` en una sola notificacion.
- Confirmar el proveedor SMTP productivo definitivo y la autenticacion SPF/DKIM/DMARC del dominio usado para correo transaccional.
- Confirmar que el proxy o hosting productivo envie correctamente `x-forwarded-proto` y permita activar `APP_FORCE_HTTPS` sin romper trafico legitimo.
- Confirmar si otros endpoints como `/api/ingresos/recibo` deben tratarse tambien como internos y protegerse con API key.
- Confirmar la carga efectiva en `cms-mazatlanic` de `MICROSERVICES_BASE_URL` y `MICROSERVICES_INTERNAL_API_KEY` para habilitar tanto la visualizacion de presencia socket como el refresh push de pantallas. En Docker local debe usarse `host.docker.internal`; bajo XAMPP, `127.0.0.1` si Node comparte maquina. En ambos casos la API key debe ser la misma que `INTERNAL_API_KEY` del microservicio.
- Validado en Docker local: `cms-mazatlanic-web` recibe `MICROSERVICES_BASE_URL` y `MICROSERVICES_INTERNAL_API_KEY`, el endpoint de estado responde `200` y el refresh push emite correctamente a una pantalla `airplay`. Pendiente de validacion: replicar la configuracion de URL y API key en XAMPP/Apache productivo.
- Comando oficial de arranque.
- `package.json` real.
- Infraestructura de despliegue y proxy/TLS.
- Uso real o legado de rutas auxiliares no montadas.
- Confirmar en la base de datos que `cat_whatsapp_types_details.id = 11` esta activo, que `name` contiene el nombre tecnico aprobado por Meta y que existen destinatarios activos en `cat_correosinternos`.
- Validar en pruebas controladas la cancelacion por reconexion, el envio despues de 60 segundos y el comportamiento cuando un destinatario falla.
- Confirmar el contrato final del ESP32: usar `/api/hware/sensor` para `POST` y `/api/hware/sensor?mac=...` para `GET`, ademas de definir autenticacion del dispositivo.
- Confirmar que el modo `6` existe activo en `cat_modocontacto` y que cada `tipo` utilizado por las plataformas corresponde a un catalogo activo.
- Probar `POST /api/web/events/contactus` con alta nueva, tipo omitido, tipo invalido, solo correo, solo celular, campos opcionales ausentes y datos con espacios/mayusculas.
- Probar un segundo mensaje con correo o celular equivalente (`669...`, `52669...`, `521669...`) y confirmar que se conserva el mismo `id_referencia` y solo queda un movimiento activo.
- Probar un lead cuyo hilo anterior tenga status terminal `11`, `14` o `15` y confirmar que se abre un nuevo hilo.
- Confirmar que el Director Comercial activo (`usu_idPuesto = 5`) aparece como responsable en el inbox y recibe `notify_operativo_general`; validar tambien el comportamiento sin Director configurado.
- Revisar en una fase separada la regla de notificacion para altas manuales del CMS: departamento `4` no debe notificar al Director, mientras que altas externas si deben hacerlo.

## Estado de la fase AirPlay
- Resuelto en Node: consulta de la playlist activa por token, presencia de sockets en memoria, endpoint interno de estado y refresh push con resultado de entrega.
- Resuelto en el flujo CMS: regla de una sola playlist activa por pantalla, verificacion posterior de la asignacion y reconstruccion compatible del carrusel Bootstrap 5.
- Validado localmente: la pantalla recibe la respuesta inicial y los eventos `response` posteriores; Node entrega `delivery_status = emitted` cuando existe un socket conectado.
- Bloqueador pendiente fuera de este repositorio: el helper `send_endpoint()` de `cms-mazatlanic` aun usa `localhost:3000` y no consume `MICROSERVICES_BASE_URL`. Desde Docker debe usar `http://host.docker.internal:3000`; bajo XAMPP debe usar la direccion real del Node.
- Proxima tarea recomendada: corregir el helper del CMS para consumir `MICROSERVICES_BASE_URL` y `MICROSERVICES_INTERNAL_API_KEY`, probar la asignacion completa sin recargar y despues retirar esta incidencia de los pendientes activos.
