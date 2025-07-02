const mysql = require('mysql');

const pool = mysql.createPool({
    connectionLimit: 10,           // ahora sí aplica
    host: '192.168.90.82',
    user: 'db_crmoperation_',
    password: '0p3r_cRm*1_',
    database: 'db_crmmazatlanic'
});

module.exports = {
    /**
     * Ejecuta una query y devuelve un Promise con los resultados.
     * @param {string} sql 
     * @param {Array} params 
     */
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            pool.query(sql, params, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });
    },
    // Por si en algún cierre de servicio necesitas drenar el pool:
    close() {
        return new Promise((res, rej) =>
            pool.end(err => (err ? rej(err) : res()))
        );
    }
};