const { connection } = require('../databases/config');


const getTarjeta = async (_uuid) => {
    try{
        // CONSULTA USANDO PARÁMETROS PREPARADOS
        const queryResult = await new Promise((resolve, reject) => {
            let sql = `
                SELECT tarjetas.id, tarjetas.uuid, status_alta 
                FROM cat_tarjetas_rfid AS tarjetas 
                WHERE tarjetas.uuid = ?`;

            connection.query(sql, [_uuid], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        return queryResult;

    }catch(error){
        throw new Error('ERROR AL ENCONTRAR LA TARJETA', error)
    }
};

module.exports = {
    getTarjeta
}
