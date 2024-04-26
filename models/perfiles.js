const { connection } = require('../databases/config');

const getPerfiles = async () => {
    try {
        // Conexión a la base de datos
        await new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Consulta de perfiles
        const queryResult = await new Promise((resolve, reject) => {
            connection.query('SELECT * FROM perfiles', (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return queryResult;
    } catch (error) {
        throw new Error('ERROR AL OBTENER LOS PERFILES: ', error);
    }
};

module.exports = {
    getPerfiles
};