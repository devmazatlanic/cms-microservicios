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



module.exports = {
    procesure_getDatosGeneralesEventosById
};