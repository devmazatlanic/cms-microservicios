const { connection } = require('../databases/config');

const procesure_getDatosGeneralesEventosById = async (evento_id) => {
    try {
        // CONSULTA DE PROCEDIMIENTO ALMACENADO
        const procesure_result = await new Promise((resolve, reject) => {
            const sql = `CALL getDatosGeneralesEventosById(?)`;

            connection.query(sql, [evento_id], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return procesure_result;
    } catch (error) {
        throw error;
    }
};

const web_today = async () => {
    try {
        const query_result = await new Promise((resolve, reject) => {
            const query = 'SELECT evento, DATE_FORMAT(fecha_inicio, "%d/%m/%Y") fecha, descripcion, image, salones FROM web_events WHERE status_alta = 1 AND ((CURRENT_DATE() BETWEEN DATE(fecha_inicio) AND DATE(fecha_final)) OR (DATE(fecha_inicio) >= DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY))) AND (DATE(fecha_final) > CURRENT_DATE() OR (DATE(fecha_final) = CURRENT_DATE() AND TIME(fecha_final) > CURRENT_TIME())) ORDER BY fecha_inicio';
            connection.query(query, (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return query_result;
    } catch (error) {
        throw error;
    }
}

const web_upcoming = async () => {
    try {
        const query_result = await new Promise((resolve, reject) => {
            const query = 'SELECT evento,DATE_FORMAT(fecha_inicio, "%d/%m/%Y") AS fecha, descripcion,image, salones FROM web_events WHERE status_alta = 1 AND ((CURRENT_DATE() BETWEEN DATE(fecha_inicio) AND DATE(fecha_final) AND TIME(fecha_final) > CURRENT_TIME()) OR DATE(fecha_inicio) >= DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)) ORDER BY fecha_inicio';
            connection.query(query, (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return query_result;
    } catch (error) {
        throw error;
    }
}

const web_contactus = async (_data) => {
    console.log(_data);
    try {
        if (!_data.nombre || !_data.apellido_paterno || !_data.apellido_materno || !_data.correo || !_data.celular) {
            throw new Error('Faltan datos requeridos para insertar en la base de datos.');
        }

        const existingRecord = await new Promise((resolve, reject) => {
            const sql = `SELECT lpc_correo FROM tcr_lpcs WHERE lpc_correo = ?`;
            connection.query(sql, [_data.correo], (error, results) => {
                if (error) {
                    reject(new Error(`Error al verificar el correo electronico: ${error.message}`));
                } else {
                    resolve(results);
                }
            });
        });

        if (existingRecord.length > 0) {
            // La IP ya existe, retorna success sin intentar registrar
            return {
                next: false,
                message: 'SU CORREO ELECTRONICO YA SE ENCUENTRA REGISTRADO, MUY PRONTO LO CONTACTAREMOS.'
            };
        }

        // REALIZANDO INSERT DEL CONTACTO
        const contactResult = await new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO tcr_lpcs (lpc_nombre, lpc_apellidoPaterno, lpc_apellidoMaterno, lpc_correo, lpc_celular, cat_idModoContacto, cat_idMedioContacto)
                VALUES (?, ?, ?, ?, ?, ?, ?)`;
            connection.query(sql, [_data.nombre, _data.apellido_paterno, _data.apellido_materno, _data.correo, _data.celular, 6, 5], (error, results) => {
                if (error) {
                    reject(new Error(`HUBO UN ERROR AL REGISTRAR SUS DATOS: ${error.message}`));
                } else {
                    resolve(results);
                }
            });
        });
        // OBTENIENDO EL ID DEL CONTACTO INSERTADO
        const lpc_id = contactResult.insertId;
        // REALIZANDO INSERT DEL COMENTARIO
        if (_data.comentario) {
            const comentarioResult = await new Promise((resolve, reject) => {
                const sql = `
                    INSERT INTO tcr_lpcscomentarios (id_lpc, comentario)
                    VALUES (?, ?)`;

                connection.query(sql, [lpc_id, _data.comentario], (error, results) => {
                    if (error) {
                        reject(new Error(`HUBO UN ERROR AL REGISTRAR SU COMENTARIO: ${error.message}`));
                    } else {
                        resolve(results);
                    }
                });
            });
        }


        // Devuelve los resultados del INSERT
        return {
            next: true,
            message: 'SU REGISTRO FUE UN EXITO, MUCHAS GRACIAS POR CONFIAR EN NOSOTROS, MUY PRONTO LO CONTACTAREMOS.'
        };
    } catch (error) {
        throw error;
    }
}

module.exports = {
    procesure_getDatosGeneralesEventosById,
    web_today,
    web_upcoming,
    web_contactus
};