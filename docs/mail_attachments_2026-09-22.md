# Adjuntos de correo simple — 2026-09-22

## Implementacion
POST /api/mail/simple acepta attachments opcional como lista de objetos:
filename, content (base64 canonico), encoding (base64), contentType opcional.
El contenido se convierte en Buffer antes de entregarlo a Nodemailer.
Solo se propagan nombre, contenido y MIME: no se aceptan rutas remotas/locales
como fuente ni se propagan headers o cid del cliente.

El limite conjunto de archivos recibidos es 10 MiB (10 * 1024 * 1024 bytes);
el logo institucional se conserva como adjunto inline adicional.
La ruta autentica antes de parsear y permite JSON hasta 15 MiB, suficiente
para ~13.34 MiB de base64 mas campos. Las otras rutas conservan 100 KB.
Adjuntos invalidos devuelven 400/next=false antes del SMTP; JSON excesivo 413;
errores de transporte 500. Sin adjuntos se conserva el logo y contrato legacy.

## Pruebas
Ejecutar: node tests/mail_attachments.test.cjs
Usa HTTP exclusivamente en loopback y SMTP/plantilla simulados.
No carga .env ni conecta a correo, base de datos o integraciones.
Cubre correo legacy, binario y logo, limite exacto 10 MiB, exceso individual y
acumulado, base64 corrupto/no canonico, ruta sin contenido, nombre/MIME invalidos,
autenticacion, JSON invalido, peticion mayor de 15 MiB, limite legacy de 100 KB
y fallo SMTP. Verificado con Node 24 local.

## Paso operativo pendiente
Estos cambios son locales; no se desplegaron ni reiniciaron servicios.
Antes de la prueba manual, actualizar el proceso que atiende el endpoint usado
por CMS y verificar cualquier limite adicional de proxy.
Probar primero un correo aislado con Excel y revisar el archivo recibido.
No hay cambios a status_alta ni a tcr_nominavariable_enviados en esta fase.
La respuesta next=true actual significa que sendMail resolvio; no garantiza
entrega a buzon ni aceptacion de todos los destinatarios. Esa confirmacion debe
definirse al integrar el envio STO.
