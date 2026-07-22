const db = require('../databases/config');

const AUTH_PENDING_NAME = 'auth_request_pending';
const AUTH_PENDING_STATUS = 'awaiting_reason';

/**
 * Almacena un request de WhatsApp en la BD.
 * @param {Object} _data
 */
const store_request = async (_data) => {
  const sql = `
    INSERT INTO whatsapp_requests (phone_number, type, name, id_message, message_status, url, filename, caption, model) VALUES (?,?,?,?,?,?,?,?,?)
  `;
  const values = [
    _data.phone_number || null,
    _data.type || null,
    _data.name || null,
    _data.id_message || null,
    _data.message_status || null,
    _data.url || null,
    _data.filename || null,
    _data.caption || null,
    JSON.stringify(_data.model || {})
  ];

  try {
    const result = await db.query(sql, values);
    // console.log('✅ Registro insertado:', result.insertId);
    return result;
  } catch (err) {
    console.error('Error al insertar en whatsapp_requests:', err);
    throw new Error('No se pudo almacenar el request en la base de datos.');
  }
};

/**
 * Almacena un mensaje entrante para futura automatizacion o bot.
 * @param {Object} _data
 */
const store_incoming_message = async (_data) => {
  const sql = `
    INSERT INTO whatsapp_requests (phone_number, type, name, id_message, message_status, url, filename, caption, model) VALUES (?,?,?,?,?,?,?,?,?)
  `;

  const values = [
    _data.phone_number || null,
    _data.type || null,
    _data.name || null,
    _data.id_message || null,
    _data.message_status || 'incoming',
    _data.url || null,
    _data.filename || null,
    _data.caption || null,
    JSON.stringify(_data.model || {})
  ];

  try {
    const result = await db.query(sql, values);
    return result;
  } catch (err) {
    console.error('Error al insertar mensaje entrante en whatsapp_requests:', err);
    throw new Error('No se pudo almacenar el mensaje entrante en la base de datos.');
  }
};

/**
 * Recupera un mensaje por su ID de mensaje de WhatsApp.
 * @param {string} _id_message
 */
const get_message = async (_id_message) => {
  const sql = `SELECT * FROM whatsapp_requests WHERE id_message = ?`;
  try {
    const rows = await db.query(sql, [_id_message]);
    // console.log(`Consulta exitosa: ${rows.length} fila(s)`);
    return rows;
  } catch (err) {
    console.error('Error al consultar whatsapp_requests:', err);
    throw new Error('No se pudo obtener el listado de mensajes.');
  }
};

/**
 * Actualiza el estado de un mensaje previamente almacenado.
 * @param {Object} _data
 */
const update_message_status = async (_data) => {
  const sql = `
    UPDATE whatsapp_requests
    SET message_status = ?
    WHERE id_message = ?
  `;

  try {
    const result = await db.query(sql, [
      _data.message_status || null,
      _data.id_message || null
    ]);
    return result;
  } catch (err) {
    console.error('Error al actualizar estado en whatsapp_requests:', err);
    throw new Error('No se pudo actualizar el estado del mensaje.');
  }
};

/**
 * Marca cualquier flujo pendiente de autorizacion previo como superseded.
 * Se usa para garantizar un solo flujo "awaiting_reason" por telefono.
 * @param {Object} _data
 */
const clear_pending_auth_request = async (_data) => {
  const sql = `
    UPDATE whatsapp_requests
    SET message_status = 'superseded'
    WHERE phone_number = ?
      AND name = ?
      AND message_status = ?
  `;

  try {
    const result = await db.query(sql, [
      _data.phone_number || null,
      AUTH_PENDING_NAME,
      AUTH_PENDING_STATUS
    ]);
    return result;
  } catch (err) {
    console.error('Error al limpiar flujo pendiente de autorizacion en whatsapp_requests:', err);
    throw new Error('No se pudo limpiar el flujo pendiente de autorizacion.');
  }
};

/**
 * Recupera un flujo pendiente de autorizacion para un telefono.
 * @param {Object} _data
 */
const get_pending_auth_request = async (_data) => {
  const sql = `
    SELECT *
    FROM whatsapp_requests
    WHERE phone_number = ?
      AND name = ?
      AND message_status = ?
    LIMIT 1
  `;

  try {
    const rows = await db.query(sql, [
      _data.phone_number || null,
      AUTH_PENDING_NAME,
      AUTH_PENDING_STATUS
    ]);
    return rows;
  } catch (err) {
    console.error('Error al consultar flujo pendiente de autorizacion en whatsapp_requests:', err);
    throw new Error('No se pudo obtener el flujo pendiente de autorizacion.');
  }
};

/**
 * Obtiene la plantilla activa y los destinatarios activos de una notificacion interna.
 * El detalle de WhatsApp funciona como la configuracion central de la notificacion.
 * @param {number|string} _id_whatsapp_type_detail
 */
const get_whatsapp_notification_config_by_type_detail = async (_id_whatsapp_type_detail) => {
  const detailId = Number.parseInt(_id_whatsapp_type_detail, 10);

  if (!Number.isFinite(detailId) || detailId <= 0) {
    return [];
  }

  const sql = `
    SELECT
      d.id AS id_whatsapp_type_detail,
      TRIM(d.nombre) AS template_name,
      d.parametros AS template_parameters,
      c.phone_number,
      UPPER(TRIM(c.nombre_completo)) AS recipient_name
    FROM cat_whatsapp_types_details d
    LEFT JOIN cat_correosinternos c
      ON c.id_whatsapp_type_detail = d.id
      AND c.status_alta = 1
      AND c.phone_number IS NOT NULL
      AND TRIM(c.phone_number) <> ''
    WHERE d.id = ?
      AND d.status_alta = 1
    ORDER BY c.id ASC
  `;

  try {
    return await db.query(sql, [detailId]);
  } catch (err) {
    console.error('Error al consultar configuracion de notificacion WhatsApp:', err);
    throw new Error('No se pudo obtener la configuracion de la notificacion WhatsApp.');
  }
};

module.exports = {
  store_request,
  get_message,
  store_incoming_message,
  update_message_status,
  clear_pending_auth_request,
  get_pending_auth_request,
  get_whatsapp_notification_config_by_type_detail
};
