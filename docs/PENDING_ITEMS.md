# Pending Items

## Activos

### Alta prioridad
- Confirmar que el `databases/config.js` efectivo en produccion coincide con la implementacion corregida en este repositorio.
- Validar con consultas reales el comportamiento del pool MySQL y de los modelos criticos.
- Definir estrategia formal para reemplazar el servicio de correo de notificaciones sin afectar compatibilidad.
- Definir estrategia para sacar secretos sensibles del repositorio y gestionarlos por ambiente de forma segura.

### Media prioridad
- Validar que no existan consumidores activos de `/api/notificaciones/*` despues de la desactivacion temporal.
- Validar con el sistema interno consumidor el contrato ampliado de `/api/whatsapp/send_notification`.
- Confirmar carga correcta de variables `WHATSAPP_*` en todos los ambientes.
- Validar en entorno real la sincronizacion de `message_status` cuando Meta envie `statuses`.
- Validar en entorno real el webhook de WhatsApp cuando Meta agrupe multiples `messages` o `changes` en un solo payload.
- Validar en entorno real el primer flujo de menu/bot para mensajes sin `context.id`, con `context.id` desconocido y sobre respuestas al propio menu.
- Corregir la validacion defectuosa en `controllers/notificaciones.js` si el modulo vuelve a habilitarse o se reutiliza parte de su logica.
- Definir si `routes/helpers.js` debe montarse o eliminarse en una fase futura.

### Pendientes de salida a produccion
- Incluir la carpeta `docs/` en el siguiente commit o corte para no perder trazabilidad tecnica del mantenimiento realizado.
- Confirmar que el token y webhook configurados en Meta apuntan al servidor productivo correcto antes del corte.
- Verificar que el servidor productivo tenga cargadas `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_API_VERSION`.
- Monitorear en logs productivos el webhook de WhatsApp durante la primera ventana de pruebas para `messages`, `statuses`, menu/bot y respuestas con `context.id`.
- Revisar en `whatsapp_requests` registros salientes, entrantes, estados sincronizados y respuestas del menu antes de retirar observacion manual.

### Baja prioridad
- Unificar progresivamente el acceso a MySQL hacia un solo estilo.
- Revisar duplicacion entre `models/autorizaciones.js` y `models/notificaciones.js`.
- Revisar duplicacion de logica socket entre `controllers/pantallas.js` y `helpers/sockets.js`.
- Limpiar referencias legacy adicionales del modulo de WhatsApp y separar plantillas vigentes vs obsoletas.
- Definir si la bitacora de WhatsApp debe conservar tambien el payload completo de `statuses` y no solo `message_status`.

## Criterio de uso
- Agregar aqui pendientes activos que todavia no se implementan.
- Mover o eliminar items cuando queden resueltos y registrar el cierre en `MAINTENANCE_LOG.md`.
- Si un pendiente cambia arquitectura o contexto, reflejarlo tambien en `ARCHITECTURE.md` o `PROJECT_CONTEXT.md`.
