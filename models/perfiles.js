const { connection } = require('../databases/config');

const getPerfiles = async () => {
    try {
        // CONEXION A LA BASE DE DATOS
        await new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // CONSULTA
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

const getUsuario = async (_idUsuario) => {
    try {
        // CONEXION A LA BASE DE DATOS
        await new Promise((resolve, reject) => {
            connection.connect((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // CONSULTA
        const queryResult = await new Promise((resolve, reject) => {
            let sql = `SELECT
                    perfiles.id_perfil,
                    UPPER(CONCAT_WS(" ", perfiles.nombre, perfiles.apellido_paterno, perfiles.apellido_materno)) AS nombre,
                    tcr_usuarios.usu_idUsuario AS id_usuario,
                    perfiles.email
                FROM tcr_usuarios
                JOIN perfiles on perfiles.id_perfil = tcr_usuarios.usu_idPerfil
                WHERE tcr_usuarios.usu_idUsuario = ${_idUsuario}`;
            connection.query(sql, (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return queryResult;
    } catch (error) {
        throw new Error('ERROR AL OBTENER EL USUARIO: ', error);
    }
};

const getCorreosByDepartamento = async (data) => {
    try {
        // CONSULTA DE SELECT - TCR_INGRESOSBANCOS
        const _select = await new Promise((resolve, reject) => {
            const _sql = `SELECT id_perfil, CONCAT_WS(" ",  nombre, apellido_paterno, apellido_materno) AS empleado, email FROM perfiles WHERE status_alta = 1 AND email <> "" AND id_departamento = ?`;

            connection.query(_sql, [data.id_departamento], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return _select;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getPerfiles,
    getUsuario,
    getCorreosByDepartamento
};