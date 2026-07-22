# Pending Items

## Activos

### Alta prioridad
- Confirmar que el `databases/config.js` efectivo en produccion coincide con la implementacion corregida en este repositorio.
- Validar con consultas reales el comportamiento del pool MySQL y de los modelos criticos.
- Definir proveedor SMTP/transaccional definitivo para produccion y una estrategia formal para reemplazar el servicio de correo de notificaciones sin afectar compatibilidad.
- Definir estrategia para sacar secretos sensibles del repositorio y gestionarlos por ambiente de forma segura.
- Validar y activar estrategia final de HTTPS en produccion con GoDaddy/cPanel o proxy, usando `APP_TRUST_PROXY` y `APP_FORCE_HTTPS` cuando el entorno lo soporte.
- Agregar controles anti-abuso a `/api/web/events/contactus`: rate limit, captcha o mecanismo equivalente.

### Media prioridad
- Validar que no existan consumidores activos de `/api/notificaciones/*` despues de la desactivacion temporal.
- Validar en entorno real el webhook de WhatsApp cuando Meta agrupe multiples `messages` o `changes` en un solo payload.
- Diseñar la fase 2 del bot de WhatsApp sobre el menu actual: enrutamiento conversacional, opciones utiles y mejor manejo de contexto.
- Separar la cuenta tecnica autenticada del remitente visible para correo transaccional, idealmente usando `no-reply@...` para notificaciones automaticas y dejando `info@...` para comunicaciones que admitan respuesta.
- Confirmar si endpoints adicionales como `/api/ingresos/recibo` deben clasificarse como internos y protegerse con la misma API key.
- Revisar y normalizar el manejo de error de los flujos activos de correo (`controllers/ingresos.js`, `controllers/web.js`) antes de cualquier reactivacion o migracion del modulo de notificaciones.
- Corregir la validacion defectuosa en `controllers/notificaciones.js` si el modulo vuelve a habilitarse o se reutiliza parte de su logica.
- Definir si `routes/helpers.js` debe montarse o eliminarse en una fase futura.
- Definir si la presencia `airplay` debe persistirse en base de datos para auditoria, dashboard o alertado, ya que en esta fase solo se mantiene en memoria del proceso Node.
- Extender el modelo push sin polling al consumidor `siteweb` cuando se retome ese frente, manteniendolo fuera del alcance actual de `airplay`.
- Migrar en `cms-mazatlanic` los consumos legacy a microservicios que siguen hardcodeados en `src/application/helpers/tools_helper.php`, especialmente IP interna y fallback de `x-api-key` para correo y WhatsApp.
- Validar en CMS que al asignar una segunda playlist a la misma pantalla la primera quede `INACTIVO`, que la pantalla reproduzca solo la nueva y que la activacion manual de una relacion historica no genere dos relaciones activas.
- Auditar relaciones legacy de `scr_pantallas_reproducciones` con mas de una fila activa por `id_pantalla`; definir una limpieza controlada o confirmar que la defensa de lectura por relacion mas reciente es suficiente para la operacion.
- Confirmar si el flujo `airplay` debe aplicar vigencia por fecha y un orden deterministico de multimedia antes de cerrar definitivamente la salida a produccion del catalogo de playlists.
- Validar la alerta WhatsApp de desconexion AirPlay: detalle activo `11`, nombre tecnico en `cat_whatsapp_types_details.name`, destinatarios activos, formato telefonico y plantilla Meta con tres parametros.
- Ejecutar pruebas controladas de desconexion sostenida, reconexion antes de 60 segundos, multiples destinatarios y fallo parcial de Meta.
- Definir en una fase futura si las alertas AirPlay requieren reintentos o una cola persistente para no perder notificaciones durante reinicios del proceso.

### Pendientes de salida a produccion
- Incluir la carpeta `docs/` en el siguiente commit o corte para no perder trazabilidad tecnica del mantenimiento realizado.
- Configurar y validar en XAMPP/Apache productivo las variables `MICROSERVICES_BASE_URL` y `MICROSERVICES_INTERNAL_API_KEY`; cuando Node comparta servidor con el CMS, la URL debe ser `http://127.0.0.1:3000` y la key debe coincidir con `INTERNAL_API_KEY` del microservicio. El escenario Docker local ya fue validado para la columna `CONEXION` y el refresh push de `airplay`.

### Baja prioridad
- Unificar progresivamente el acceso a MySQL hacia un solo estilo.
- Revisar duplicacion entre `models/autorizaciones.js` y `models/notificaciones.js`.
- Revisar duplicacion de logica socket entre `controllers/pantallas.js` y `helpers/sockets.js`.
- Limpiar referencias legacy adicionales del modulo de WhatsApp y separar plantillas vigentes vs obsoletas.
- Definir si la bitacora de WhatsApp debe conservar tambien el payload completo de `statuses` y no solo `message_status`.
- Revisar y reducir los `console.log` de WhatsApp cuando termine la ventana de observacion productiva.
- Evaluar proveedor transaccional dedicado para correo no marketing:
  Postmark, Amazon SES, Resend u otra opcion equivalente, segun entregabilidad, costos y operacion.
- Mantener una iteracion futura del bot de WhatsApp fase 2 como frente activo cuando se retome el modulo conversacional.

## Criterio de uso
- Agregar aqui pendientes activos que todavia no se implementan.
- Mover o eliminar items cuando queden resueltos y registrar el cierre en `MAINTENANCE_LOG.md`.
- Si un pendiente cambia arquitectura o contexto, reflejarlo tambien en `ARCHITECTURE.md` o `PROJECT_CONTEXT.md`.
