const { connection } = require('../databases/config');


const getPantallabyId = async (id) => {
    try{
        // CONSULTA USANDO PARÁMETROS PREPARADOS
        const queryResult = await new Promise((resolve, reject) => {
            let sql = `
                SELECT *
                FROM scr_pantallas 
                WHERE scr_pantallas.id = ?`;

            connection.query(sql, [id], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
        return queryResult;

    }catch(error){
        throw new Error('ERROR AL ENCONTRAR LA PANTALLA', error)
    }
};

const getPantallabyToken = async (token) => {
    try{
        // CONSULTA USANDO PARÁMETROS PREPARADOS
        const queryResult = await new Promise((resolve, reject) => {
            let sql = `
                SELECT *
                FROM scr_pantallas 
                WHERE scr_pantallas.token = ?`;

            connection.query(sql, [token], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
        return queryResult;

    }catch(error){
        console.error(error);
        throw new Error('ERROR AL ENCONTRAR LA PANTALLA', error)
    }
};

const getPlaylisPantallabyToken = async (token) => {
    try{
        const queryResult = await new Promise((resolve, reject) => {
            let sql = `
                SELECT 
                    DATE(sr.fecha_inicio) AS fecha_inicio,
                    sp.nombre AS pantalla,
                    sp.token,
                    sp.host,
                    sp.token,
                    sr.nombre AS reproduccion,
                    srd.source
                FROM scr_pantallas_reproducciones spr
                JOIN (
                    SELECT * FROM scr_reproducciones WHERE status_alta = 1
                ) sr ON sr.id = spr.id_reproduccion
                JOIN (
                    SELECT * FROM scr_reproducciones_detalles WHERE status_alta = 1
                ) srd ON srd.id_reproduccion = sr.id
                JOIN scr_pantallas sp ON sp.id = spr.id_pantalla
                WHERE spr.status_alta = 1
                AND sp.token  = ?`;
            
            connection.query(sql, [token], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
        
        return queryResult;

    }catch(error){
        throw new Error('ERROR AL ENCONTRAR LA PANTALLA', error);
    }
}

const createPantalla = async (data) => {
    try {
        // CONSULTA DE INSERCION - TCR_AUTORIZACIONSOLICITUD
            const _sql = `INSERT INTO scr_pantallas (nombre, host, token) VALUES (?, ?, ?)`;
            const _store = await new Promise((resolve, reject) => {
            connection.query(_sql, [data.nombre, data.host,data.token], (error, results) => {
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
    getPantallabyId,
    getPantallabyToken,
    createPantalla,
    getPlaylisPantallabyToken
}
