# Setup

## Requisitos detectados
- Node.js
- npm o entorno equivalente ya preparado
- acceso a MySQL
- acceso a un proveedor SMTP o servicio de correo transaccional
- acceso a WhatsApp Cloud API / Meta
- variables de entorno configuradas

## Configuraciones iniciales
- Archivo `.env` detectado
- Certificados locales detectados en `certs/`
- Dependencias instaladas visibles en `node_modules/`

## Variables relevantes
- `PORT`
- `API_CORS`
- `SOCKET_CORS`
- `APP_TRUST_PROXY`
- `APP_FORCE_HTTPS`
- `APP_ENABLE_HTTPS_SERVER`
- `APP_HTTPS_KEY_PATH`
- `APP_HTTPS_CERT_PATH`
- `APP_ENABLE_IPDEVICE_ROUTE`
- `INTERNAL_API_KEY`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_API_VERSION`
- `AIRPLAY_DISCONNECT_NOTIFICATION_DETAIL_ID` (opcional; por defecto `11`)
- `AIRPLAY_DISCONNECT_DELAY_MS` (opcional; por defecto `60000` milisegundos)
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_SECURE`
- `MAIL_REQUIRE_TLS`
- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_TLS_REJECT_UNAUTHORIZED`
- `MAIL_POOL`
- `MAIL_MAX_CONNECTIONS`
- `MAIL_MAX_MESSAGES`
- `MAIL_RATE_DELTA_MS`
- `MAIL_RATE_LIMIT`
- `MAIL_CONNECTION_TIMEOUT_MS`
- `MAIL_GREETING_TIMEOUT_MS`
- `MAIL_SOCKET_TIMEOUT_MS`
- `MAIL_FROM_DEFAULT`
- `MAIL_FROM_INFO`
- `MAIL_CC_SISTEMAS`
- `MAIL_CC_WEB_CONTACT`
- `MICROSERVICES_BASE_URL` (en `cms-mazatlanic`; local Docker Desktop: `http://host.docker.internal:3000`)
- `MICROSERVICES_INTERNAL_API_KEY` (en `cms-mazatlanic`; debe coincidir exactamente con `INTERNAL_API_KEY` del microservicio)

Nota de integracion: Node puede ejecutarse directamente en `http://localhost:3000`; la URL que debe cambiar por entorno es la que usa el CMS PHP. En Docker Desktop el CMS debe usar `http://host.docker.internal:3000`; bajo XAMPP, si ambos servicios comparten maquina, puede usar `http://127.0.0.1:3000`.

Pendiente de validacion:
- variables adicionales esperadas por produccion
- ubicacion final de secretos que hoy residen principalmente en `.env` y otros archivos locales del repositorio

## Dependencias detectadas
- `axios`
- `cors`
- `dotenv`
- `express`
- `handlebars`
- `macaddress`
- `mysql`
- `nodemailer`
- `socket.io`

## Pasos de arranque inferidos
1. Asegurar que `.env` exista y sea valido.
2. Asegurar conectividad a MySQL.
3. Verificar credenciales SMTP y variables de WhatsApp/Meta.
4. Confirmar la configuracion activa del detalle de WhatsApp usado para alertas AirPlay y sus destinatarios.
5. Instalar dependencias si el entorno no las tiene.
6. Iniciar el servicio usando el entrypoint `app.js`.

## Nota sobre correo
- `config/mail.js` ya no depende de un proveedor SMTP hardcodeado; el transporte se configura por `MAIL_*`.
- El transporte SMTP se inicializa de forma perezosa al primer envio y usa pool, throttling y timeouts configurables.
- Para produccion se recomienda definir `MAIL_*` en el ambiente real y no en codigo.
- Si el relay actual es GoDaddy o Microsoft 365, conviene mantener limites conservadores de envio y revisar autenticacion SPF, DKIM y DMARC.
- El endpoint interno `POST /api/mail/simple` reutiliza este mismo transporte SMTP.

## Nota sobre seguridad
- `APP_TRUST_PROXY` permite que la app reconozca correctamente cabeceras del proxy o hosting.
- `APP_FORCE_HTTPS` deja preparada la app para redirigir o exigir HTTPS cuando el entorno ya lo soporte de forma estable.
- `APP_ENABLE_HTTPS_SERVER` solo deberia activarse si realmente se quiere terminar TLS dentro de Node.
- `INTERNAL_API_KEY` protege endpoints internos como `/api/mail/simple` y `/api/whatsapp/send_notification`.
- Los clientes internos pueden enviar la clave por `x-api-key` o `Authorization: Bearer ...`.

## Riesgos o huecos en instalacion
- Pendiente de validacion: `package.json` no presente en el analisis.
- Pendiente de validacion: version de Node recomendada.
- Pendiente de validacion: script oficial de arranque.
- Posible dependencia de infraestructura local/red privada para la base de datos.
- Si `cms-mazatlanic` corre dentro de Docker y Node corre en el host, `localhost` dentro de PHP no apunta al microservicio; en Docker Desktop debe usarse `host.docker.internal`.
- Si `cms-mazatlanic` corre bajo XAMPP, `MICROSERVICES_BASE_URL` debe apuntar a `127.0.0.1:3000` cuando Node este en la misma maquina, y `MICROSERVICES_INTERNAL_API_KEY` debe inyectarse en Apache con `SetEnv`.
- Riesgo alto si se usan credenciales versionadas sin rotacion.
- Pendiente de validacion: proveedor SMTP productivo definitivo y estrategia de reputacion/entregabilidad.
- Pendiente de validacion: configuracion final de proxy/HTTPS en el hosting productivo.
