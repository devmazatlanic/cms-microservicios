const { connection } = require('../databases/config');

const addMapeoQr = async (_data) => {
    try {
        // Validar que los datos requeridos estén presentes
        if (!_data.qr || !_data.ip) {
            throw new Error('Faltan datos requeridos para insertar en la base de datos.');
        }

        // Realizar la consulta INSERT usando parámetros preparados
        const insertResult = await new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO tcr_mapeo_qr (cat_id_qr, ip)
                VALUES (?, ?)`;

            connection.query(sql, [_data.qr, _data.ip], (error, results) => {
                if (error) {
                    reject(new Error(`Error al ejecutar el INSERT: ${error.message}`));
                } else {
                    resolve(results);
                }
            });
        });

        // Devuelve los resultados del INSERT
        return insertResult;

    } catch (error) {
        // console.error('Error en addMapeoQr:', error.message);
        throw error; // Propaga el error para manejo en niveles superiores
    }
};



module.exports = {
    addMapeoQr
}
