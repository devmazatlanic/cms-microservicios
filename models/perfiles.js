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

const getPerfil = async (_uuid) => {
    try{
        
        // CONSULTA USANDO PARÁMETROS PREPARADOS
        const queryResult = await new Promise((resolve, reject) => {
            let sql = `
                SELECT pf.id_perfil, pf._uuid, cat_tarjetas_rfid.id AS tarjetaId 
                FROM perfiles AS pf 
                LEFT JOIN cat_tarjetas_rfid ON cat_tarjetas_rfid.uuid = pf._uuid
                WHERE pf._uuid = ?`;

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
        throw new Error('', error);
    }
}

const getUsuario = async (_idUsuario) => {
    try {
        // CONSULTA USANDO PARÁMETROS PREPARADOS
        const queryResult = await new Promise((resolve, reject) => {
            let sql = `
                SELECT
                    perfiles.id_perfil,
                    UPPER(CONCAT_WS(" ", perfiles.nombre, perfiles.apellido_paterno, perfiles.apellido_materno)) AS nombre,
                    tcr_usuarios.usu_idUsuario AS id_usuario,
                    perfiles.email
                FROM tcr_usuarios
                JOIN perfiles on perfiles.id_perfil = tcr_usuarios.usu_idPerfil
                WHERE tcr_usuarios._uuid = ?`;

            connection.query(sql, [_idUsuario], (error, results) => {
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
    getPerfil,
    getCorreosByDepartamento
};