const mysql = require('mysql');

const pool = mysql.createPool({
    connectionLimit: 10,           // ahora sí aplica
    host: '192.168.90.117',
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
    /**
     * Ejecuta varias operaciones usando la misma conexion del pool.
     * @param {Function} callback
     */
    transaction(callback) {
        return new Promise((resolve, reject) => {
            pool.getConnection((connectionError, connection) => {
                if (connectionError) {
                    reject(connectionError);
                    return;
                }

                const query = (sql, params = []) => new Promise((queryResolve, queryReject) => {
                    connection.query(sql, params, (error, results) => {
                        if (error) {
                            queryReject(error);
                            return;
                        }

                        queryResolve(results);
                    });
                });

                connection.beginTransaction(async (transactionError) => {
                    if (transactionError) {
                        connection.release();
                        reject(transactionError);
                        return;
                    }

                    try {
                        const result = await callback({ query });

                        connection.commit((commitError) => {
                            if (commitError) {
                                connection.rollback(() => connection.release());
                                reject(commitError);
                                return;
                            }

                            connection.release();
                            resolve(result);
                        });
                    } catch (error) {
                        connection.rollback(() => {
                            connection.release();
                            reject(error);
                        });
                    }
                });
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
