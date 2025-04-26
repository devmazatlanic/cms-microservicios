const { connection } = require('../databases/config');


const store_request = async (_data) => {
    try {
      const sql = `INSERT INTO whatsapp_requests (phone_number, type, name, id_message, message_status, url, filename, caption, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
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
  
      const insertResult = await new Promise((resolve, reject) => {
        connection.query(sql, values, (err, result) => {
          if (err) {
            console.error("Error al insertar:", err);
            reject(err);
          } else {
            // console.log("✅ Registro insertado con ID:", result.insertId);
            resolve(result);
          }
        });
      });
  
      return insertResult;
    } catch (error) {
      console.error("Error en store_request:", error.message);
      throw new Error("No se pudo almacenar el request en la base de datos.");
    }
};
  
const get_message = async (_id_message) => {
    try {
      const sql = `SELECT * FROM whatsapp_requests WHERE id_message = ?`;
  
      const queryResult = await new Promise((resolve, reject) => {
        connection.query(sql, [_id_message], (error, results) => {
          if (error) {
            console.error("Error al consultar whatsapp_requests:", error.message);
            reject(error);
          } else {
            console.log('Consulta exitosa, resultados:', results.length);
            resolve(results);
          }
        });
      });
  
      return queryResult;
  
    } catch (error) {
      console.error("Error en get_requests:", error.message);
      throw new Error("No se pudo obtener el listado de mensajes.");
    }
  };
  

module.exports = {
    store_request,
    get_message
}
