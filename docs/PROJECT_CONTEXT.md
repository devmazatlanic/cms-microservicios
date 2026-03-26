# Project Context

## Proposito del sistema
Exponer microservicios de apoyo para operaciones ligadas a CRM/eventos, particularmente integraciones de comunicacion, hardware e informacion publica.

## Alcance funcional inferido
- notificaciones por correo, actualmente deshabilitadas temporalmente en las rutas expuestas
- solicitudes de autorizacion y cancelacion
- envio de recibos y reportes
- webhook y envio saliente de WhatsApp
- registro de eventos RFID
- consulta de eventos del dia y proximos eventos
- captura de formularios de contacto web
- administracion basica de pantallas y playlists

## Modulos detectados
- `notificaciones`
- `ingresos`
- `whatsapp`
- `rfid`
- `pantallas`
- `web`
- `perfiles`

## Reglas visibles del sistema
- La mayoria de endpoints responden JSON.
- La base de datos se consulta directamente desde modelos con SQL manual.
- WhatsApp usa un webhook con verificacion por token.
- Correo usa plantillas HTML Handlebars.
- El sistema depende de tablas legacy con prefijos `tcr_`, `scr_`, `sis_` y `cat_`.
- Parte del comportamiento esta impulsado por procedimientos almacenados.

## Dependencias clave
- Base de datos MySQL
- SMTP Office 365
- WhatsApp Cloud API / Meta
- Variables de entorno para puerto y CORS
- Plantillas de correo en disco
- Socket.IO para flujos de pantallas y sitio web

## Contexto adicional confirmado
- `/api/whatsapp/send_notification` es un endpoint de uso interno.
- `whatsapp_requests` se usa como bitacora principal de mensajes WhatsApp, incluyendo mensajes salientes, entrantes y sincronizacion basica de `message_status`.
- El modulo de WhatsApp tiene proyeccion futura hacia automatizacion conversacional o bot.
- El modulo de WhatsApp ya cuenta con un flujo inicial de menu/bot para mensajes sin contexto y respuestas basicas de ayuda operativa.
- `/api/notificaciones/*` esta deshabilitado temporalmente mientras se define un reemplazo del servicio de correo.

## Riesgos o vacios de contexto
- Pendiente de validacion: topologia real de despliegue.
- Pendiente de validacion: si HTTPS termina en proxy externo.
- Pendiente de validacion: adaptador de base de datos real usado en produccion.
- Hipotesis: el servicio forma parte de un ecosistema mayor y no opera como sistema autonomo.
- No se encontro documentacion operativa ni pruebas automatizadas.

## Prioridades de mantenimiento
1. Confirmar la configuracion operativa real.
2. Documentar contratos de API y dependencias externas.
3. Corregir bugs confirmados de runtime.
4. Extraer y rotar secretos sensibles.
5. Reducir acoplamiento y duplicacion antes de cualquier migracion mayor.
