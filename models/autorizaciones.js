const { connection } = require('../databases/config');

const getSolicitudAutorizacion = async (_idSolicitudAutorizacion) => {
    try {
        // CONSULTA
        const queryResult = await new Promise((resolve, reject) => {
            const sql = `SELECT
                            quiensolicito.id_usuario AS id_quiensolicita,
                            quiensolicito.nombreperfil AS quiensolicita,
                            quiensolicito.email as email_quiensolicita,
                            tcr_autorizacionsolicitud.comentarios,
                            quienautoriza.*
                        FROM tcr_autorizacionsolicitud
                        JOIN (
                            SELECT
                                concat_ws(" ", perfiles.nombre, perfiles.apellido_paterno, perfiles.apellido_materno) AS nombreperfil,
                                perfiles.id_perfil,
                                perfiles.email,
                                tcr_usuarios.usu_idUsuario AS id_usuario
                            FROM tcr_usuarios
                            JOIN perfiles ON perfiles.id_perfil = tcr_usuarios.usu_idPerfil
                        ) AS quiensolicito ON quiensolicito.id_usuario = tcr_autorizacionsolicitud.id_quienregistro
                        JOIN (
                            SELECT
                                cat_autorizacionusuarios.id_usuario AS id_quienautoriza,
                                cat_autorizacionusuarios.nombre_tabla,
                                upper(autorizados.nombreperfil) AS quienautoriza,
                                autorizados.email as email_quienautoriza
                            FROM cat_autorizacionusuarios
                            JOIN (
                                SELECT
                                    concat_ws(" ", perfiles.nombre, perfiles.apellido_paterno, perfiles.apellido_materno) AS nombreperfil,
                                    perfiles.id_perfil,
                                    perfiles.email,
                                    tcr_usuarios.usu_idUsuario AS id_usuario
                                FROM tcr_usuarios
                                JOIN perfiles ON perfiles.id_perfil = tcr_usuarios.usu_idPerfil
                            ) AS autorizados ON autorizados.id_usuario = cat_autorizacionusuarios.id_usuario
                        ) AS quienautoriza ON quienautoriza.nombre_tabla = tcr_autorizacionsolicitud.nombre_tabla
                        WHERE tcr_autorizacionsolicitud.id = ?`;

            connection.query(sql, [_idSolicitudAutorizacion], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return queryResult;
    } catch (error) {
        throw error;
    }
};


module.exports = {
    getSolicitudAutorizacion
};