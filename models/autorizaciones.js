const  connection  = require('../databases/config');

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

const setSolicitudAutorizacionByNotificacion = async (data) => {
    try {
        // CONSULTA DE INSERCION - TCR_AUTORIZACIONSOLICITUD
        const sql_autorizacionsolicitud = `INSERT INTO tcr_autorizacionsolicitud (id_quienregistro, id_registro_tabla, nombre_tabla, comentarios) VALUES (?, ?, ?, ?)`;
        const insert_autorizacionsolicitud = await new Promise((resolve, reject) => {
            connection.query(sql_autorizacionsolicitud, [data.usuario_id, data.tabla_id, data.nombre_tabla, data.comentarios], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });
        // CONSULTA DE INSERCOIN - SIS_NOTIFICACIONES
        const sql_sis_notificaciones = `INSERT INTO sis_notificaciones (icon, Title, msg, info, position) VALUES (?, ?, ?, ?, ?)`;
        const insert_sis_notificaciones = await new Promise((resolve, reject) => {
            connection.query(sql_sis_notificaciones, ["fa fa-exclamation", "SOLICITUD DE AUTORIZACIÓN", '<div style="font-size:10px;">' + data.comentarios + '</div>', " ", "bottom right"], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });
        // CONSULTA DE INSERCOIN - SIS_NOTIFICACIONES - NOTIFICAMOS AL USUARIO QUIEN SOLICITO
        const insert_sis_notificaciones_usuario = await new Promise((resolve, reject) => {
            connection.query(sql_sis_notificaciones, ["fa fa-exclamation", "NOTIFICACION", '<div style="font-size:10px;">SU SOLICITUD FUE ENVIADA.</div>', " ", "bottom right"], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });
        // CONSULTA DE SELECT - CAT_AUTORIZACIONUSUARIOS
        const select_cat_autorizacionusuarios = await new Promise((resolve, reject) => {
            const sql_cat_autorizacionusuarios = `SELECT
                    tcr_usuarios.usu_idUsuario as idUsuario,
                    getNombreUsuario(cat_autorizacionusuarios.id_usuario) AS usuario,
                    cat_autorizacionusuarios.nombre_tabla,
                    IF(perfiles.email IS NULL, perfiles.email_alternativo, perfiles.email) AS correo
                FROM cat_autorizacionusuarios
                JOIN tcr_usuarios ON tcr_usuarios.usu_idUsuario = cat_autorizacionusuarios.id_usuario
                JOIN perfiles ON perfiles.id_perfil = tcr_usuarios.usu_idPerfil
                WHERE cat_autorizacionusuarios.status_alta = 1 AND LOWER(cat_autorizacionusuarios.nombre_tabla) LIKE ?`;

            // Usamos CONCAT para concatenar los caracteres "%" con el parámetro de búsqueda
            const searchTerm = '%' + data.nombre_tabla.toLowerCase() + '%';

            connection.query(sql_cat_autorizacionusuarios, [searchTerm], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });
        // NOTIFICAMOS AHORA A LOS USUARIOS CORRESPONDIENTES PARA QUE SEPAN QUE TIENEN UNA SOLICITUD
        if (select_cat_autorizacionusuarios.length > 0) {
            // CONSULTA DE INSERCOIN - SIS_NOTIFICACIONESCLIENTES
            const sql_sis_notificacionesclientes = `INSERT INTO sis_notificacionesclientes (idSis_notificacion, idAdmonUsuario) VALUES (?, ?)`;
            select_cat_autorizacionusuarios.forEach(async (result) => {
                const insert_sis_notificacionesclientes = await new Promise((resolve, reject) => {
                    connection.query(sql_sis_notificacionesclientes, [insert_sis_notificaciones.insertId, result.idUsuario], (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    });
                });
            });
            // CONSULTA DE INSERCOIN - SIS_NOTIFICACIONESCLIENTES - NOTIFICAMOS AL USUARIO QUIEN SOLICITO
            const insert_sis_notificacionesclientes_usuario = await new Promise((resolve, reject) => {
                connection.query(sql_sis_notificacionesclientes, [insert_sis_notificaciones_usuario.insertId, data.usuario_id], (error, results) => {
                    if (error) reject(error);
                    else resolve(results);
                });
            });
        }


        // DATOS A MANDAR AL CLIENTE
        let data_return = {
            "tcr_autorizacionsolicitud": insert_autorizacionsolicitud.insertId,
            "sis_notificaciones": insert_sis_notificaciones.insertId,
            "destinatarios": select_cat_autorizacionusuarios
        };

        return data_return;
    } catch (error) {
        throw error;
    }
};



module.exports = {
    getSolicitudAutorizacion,
    setSolicitudAutorizacionByNotificacion
};