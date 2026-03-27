# Known Issues

Este archivo concentra issues, riesgos, deuda tecnica y pendientes activos.
El historial de cambios aplicados se conserva en `MAINTENANCE_LOG.md`.

## Prioridad Alta
- Secretos sensibles detectados en codigo o repositorio:
  SMTP, `.env`, certificados y configuraciones que aun requieren estrategia segura por ambiente.
- El modulo de correo ya puede configurarse por entorno, pero sigue pendiente definir un proveedor SMTP/transaccional productivo con mejor entregabilidad y menor riesgo de bloqueo que un relay de buzon generalista.
- El endpoint interno `/api/mail/simple` no tiene autenticacion propia; si se expone fuera de una red confiable puede usarse para envios no autorizados.
- CORS configurado dos veces y finalmente abierto globalmente.
- HTTPS preparado pero deshabilitado; el servidor actual usa HTTP.

## Prioridad Media
- `controllers/pantallas.js` usa `GET` leyendo `request.body`.
- Descarga de adjuntos por URL en correo: posible superficie SSRF y escritura temporal local.
- `controllers/ingresos.js` responde al cliente antes de confirmar el envio del correo, y el helper `mail_enviar_recibodeingreso` no propaga fallo hacia el controlador.
- Logica socket duplicada entre `controllers/pantallas.js` y `helpers/sockets.js`.

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

## Hallazgos pendientes de validar
- Configuracion de base de datos real en produccion.
- Confirmar que el `databases/config.js` efectivo en produccion coincide con la implementacion corregida en este repositorio.
- Confirmar que no existan consumidores activos de `/api/notificaciones/*` tras la desactivacion temporal.
- Validar en entorno real el comportamiento del webhook cuando lleguen multiples mensajes o multiples `changes` en una sola notificacion.
- Confirmar el proveedor SMTP productivo definitivo y la autenticacion SPF/DKIM/DMARC del dominio usado para correo transaccional.
- Comando oficial de arranque.
- `package.json` real.
- Infraestructura de despliegue y proxy/TLS.
- Uso real o legado de rutas auxiliares no montadas.
