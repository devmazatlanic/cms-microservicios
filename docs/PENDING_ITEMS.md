# Pending Items

## Activos

### Alta prioridad
- Confirmar que el `databases/config.js` efectivo en produccion coincide con la implementacion corregida en este repositorio.
- Validar con consultas reales el comportamiento del pool MySQL y de los modelos criticos.
- Definir proveedor SMTP/transaccional definitivo para produccion y una estrategia formal para reemplazar el servicio de correo de notificaciones sin afectar compatibilidad.
- Definir estrategia para sacar secretos sensibles del repositorio y gestionarlos por ambiente de forma segura.
- Definir control de acceso para `/api/mail/simple` antes de exponerlo en un entorno no aislado: API key, allowlist de IPs o restriccion de red.

### Media prioridad
- Validar que no existan consumidores activos de `/api/notificaciones/*` despues de la desactivacion temporal.
- Validar en entorno real el webhook de WhatsApp cuando Meta agrupe multiples `messages` o `changes` en un solo payload.
- Diseñar la fase 2 del bot de WhatsApp sobre el menu actual: enrutamiento conversacional, opciones utiles y mejor manejo de contexto.
- Separar la cuenta tecnica autenticada del remitente visible para correo transaccional, idealmente usando `no-reply@...` para notificaciones automaticas y dejando `info@...` para comunicaciones que admitan respuesta.
- Revisar y normalizar el manejo de error de los flujos activos de correo (`controllers/ingresos.js`, `controllers/web.js`) antes de cualquier reactivacion o migracion del modulo de notificaciones.
- Corregir la validacion defectuosa en `controllers/notificaciones.js` si el modulo vuelve a habilitarse o se reutiliza parte de su logica.
- Definir si `routes/helpers.js` debe montarse o eliminarse en una fase futura.

### Pendientes de salida a produccion
- Incluir la carpeta `docs/` en el siguiente commit o corte para no perder trazabilidad tecnica del mantenimiento realizado.

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
