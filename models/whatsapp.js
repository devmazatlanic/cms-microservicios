const db = require('../databases/config');

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
    _data.type         || null,
    _data.name         || null,
    _data.id_message   || null,
    _data.message_status || null,
    _data.url          || null,
    _data.filename     || null,
    _data.caption      || null,
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

module.exports = {
  store_request,
  get_message
};
