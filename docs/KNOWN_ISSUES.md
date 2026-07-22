# Known Issues

Este archivo concentra issues, riesgos, deuda tecnica y pendientes activos.
El historial de cambios aplicados se conserva en `MAINTENANCE_LOG.md`.

## Correcciones recientes pendientes de validacion
- 2026-07-22: se corrigio la consulta de configuracion de alertas AirPlay que interpretaba el detalle `11` con base numerica `11` y consultaba el registro `12`; tambien se corrigio la columna de plantilla de `nombre` a `name`. Falta confirmar el comportamiento con la base de datos real y reiniciar Node para cargar el cambio.

## Prioridad Alta
- Secretos sensibles detectados en codigo o repositorio:
  SMTP, `.env`, certificados y configuraciones que aun requieren estrategia segura por ambiente.
- El modulo de correo ya puede configurarse por entorno, pero sigue pendiente definir un proveedor SMTP/transaccional productivo con mejor entregabilidad y menor riesgo de bloqueo que un relay de buzon generalista.
- El endpoint publico `/api/web/events/contactus` sigue sin controles anti-abuso visibles como rate limit, captcha u otra verificacion de origen humano.
- La estrategia final de HTTPS en produccion sigue pendiente de activacion y validacion en el hosting/proxy.

## Prioridad Media
- `controllers/pantallas.js` usa `GET` leyendo `request.body`.
- Descarga de adjuntos por URL en correo: posible superficie SSRF y escritura temporal local.
- `controllers/ingresos.js` responde al cliente antes de confirmar el envio del correo, y el helper `mail_enviar_recibodeingreso` no propaga fallo hacia el controlador.
- Logica socket duplicada entre `controllers/pantallas.js` y `helpers/sockets.js`.
- La presencia `airplay` se mantiene solo en memoria del proceso Node; si el servicio reinicia, se pierde el estado online/offline y el historial reciente de conexiones.
- El alta automatica de pantallas desde el flujo `airplay` sigue desalineada con el modelo actual: `helpers/sockets.js` intenta crear por `token`, mientras `models/pantallas.js` inserta `nombre`, `host` y `token`.
- `cms-mazatlanic/src/application/helpers/tools_helper.php` sigue consumiendo microservicios con IP interna y fallback hardcodeado de `x-api-key` en flujos legacy de correo y WhatsApp; el nuevo catalogo de pantallas ya no replica ese patron, pero la deuda tecnica permanece activa.
- Pendiente de validacion: el flujo `airplay` no define orden explicito de reproduccion en `models/pantallas.js`; `getPlaylisPantallabyToken()` y `getDefaultPlaylist()` dependen del orden natural de MySQL.
- Pendiente de validacion: las condiciones de vigencia por fecha de playlist en `models/pantallas.js` siguen comentadas, por lo que una pantalla podria recibir contenido fuera de ventana si el dato permanece activo.
- Pendiente de validacion: pueden existir relaciones historicas legacy con `status_alta = 1` repetidas para una misma pantalla. Las nuevas altas, ediciones y reactivaciones ya aplican reemplazo exclusivo, y el consumidor Node usa la relacion activa mas reciente como respaldo; falta auditar y normalizar los datos existentes.
- La alerta de desconexion AirPlay mantiene sus temporizadores en memoria; si Node se reinicia durante los 60 segundos de gracia, ese aviso no se recupera.
- El nombre de la plantilla se consulta dinamicamente desde `cat_whatsapp_types_details.name`, pero la alerta mantiene un contrato de tres parametros y el idioma `es` en codigo; cambiar cantidad, orden o idioma requiere validacion adicional.

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
