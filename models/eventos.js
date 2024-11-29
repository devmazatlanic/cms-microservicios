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

const evenots_web_hoy = async () => {
    try {
        const query_result = await new Promise((resolve, reject) => {
            const query = 'SELECT evento, DATE_FORMAT(fecha_inicio, "%d/%m/%Y") fecha, descripcion, image, salones FROM web_events WHERE status_alta = 1 AND CURRENT_DATE() BETWEEN DATE(fecha_inicio) AND DATE(fecha_final)';

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

const evenots_web_proximos = async () => {
    try {
        const query_result = await new Promise((resolve, reject) => {
            const query = 'SELECT evento, DATE_FORMAT(fecha_inicio, "%d/%m/%Y") fecha, descripcion, image, salones FROM web_events WHERE status_alta = 1 AND DATE(fecha_inicio) >= DATE_ADD(CURRENT_DATE(), "INTERVAL 1 DAY")';

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

module.exports = {
    procesure_getDatosGeneralesEventosById,
    evenots_web_hoy,
    evenots_web_proximos
};