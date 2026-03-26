# Setup

## Requisitos detectados
- Node.js
- npm o entorno equivalente ya preparado
- acceso a MySQL
- acceso a SMTP Office 365
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
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_API_VERSION`

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
4. Instalar dependencias si el entorno no las tiene.
5. Iniciar el servicio usando el entrypoint `app.js`.

## Riesgos o huecos en instalacion
- Pendiente de validacion: `package.json` no presente en el analisis.
- Pendiente de validacion: version de Node recomendada.
- Pendiente de validacion: script oficial de arranque.
- Posible dependencia de infraestructura local/red privada para la base de datos.
- Riesgo alto si se usan credenciales versionadas sin rotacion.
