const connection  = require('../databases/config');

const getDispositivo = async (_mac_address) => {
    try {
        // CONSULTA USANDO PARÁMETROS PREPARADOS
        const queryResult = await new Promise((resolve, reject) => {
            let sql = `SELECT * FROM cat_dispositivos_lectores_rfid WHERE UPPER(mac_address) = UPPER(?)`;

            connection.query(sql, [_mac_address], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        return queryResult;
    } catch (error) {
        console.error('ERROR AL OBTENER EL USUARIO:', error);
        throw error; // Ahora lanzamos el error original
    }
};

const store = async (data) => {
    try {
        // CONSULTA DE INSERCION - TCR_AUTORIZACIONSOLICITUD
            const _sql = `INSERT INTO checador_rfid (id_dispositivo_lector, id_perfil, id_tarjeta_rfid) VALUES (?, ?, ?)`;
            const _store = await new Promise((resolve, reject) => {
            connection.query(_sql, [data.id_dispositivo_lector, data.id_perfil, data.id_tarjeta_rfid], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        // DATOS A MANDAR AL CLIENTE
        let data_return = {
            "next": _store.insertId,
            "next": true
        };

        return data_return;
    } catch (error) {
        throw error;
    }
};


module.exports = {
    getDispositivo,
    store
};