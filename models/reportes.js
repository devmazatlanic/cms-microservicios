const  connection = require('../databases/config');


const getReportesBancos = async () => {
    try {
        // CONSULTA DE INSERCION - TCR_AUTORIZACIONSOLICITUD
        // const sql_autorizacionsolicitud = `INSERT INTO tcr_autorizacionsolicitud (id_quienregistro, id_registro_tabla, nombre_tabla, comentarios) VALUES (?, ?, ?, ?)`;
        // const insert_autorizacionsolicitud = await new Promise((resolve, reject) => {
        //     connection.query(sql_autorizacionsolicitud, [data.usuario_id, data.tabla_id, data.nombre_tabla, data.comentarios], (error, results) => {
        //         if (error) reject(error);
        //         else resolve(results);
        //     });
        // });
        // CONSULTA DE INSERCOIN - SIS_NOTIFICACIONES
        // const sql_sis_notificaciones = `INSERT INTO sis_notificaciones (icon, Title, msg, info, position) VALUES (?, ?, ?, ?, ?)`;
        // const insert_sis_notificaciones = await new Promise((resolve, reject) => {
        //     connection.query(sql_sis_notificaciones, ["fa fa-exclamation", "SOLICITUD DE AUTORIZACIÓN", '<div style="font-size:10px;">' + data.comentarios + '</div>', " ", "bottom right"], (error, results) => {
        //         if (error) reject(error);
        //         else resolve(results);
        //     });
        // });
        // CONSULTA DE INSERCOIN - SIS_NOTIFICACIONES - NOTIFICAMOS AL USUARIO QUIEN SOLICITO
        // const insert_sis_notificaciones_usuario = await new Promise((resolve, reject) => {
        //     connection.query(sql_sis_notificaciones, ["fa fa-exclamation", "NOTIFICACION", '<div style="font-size:10px;">SU SOLICITUD FUE ENVIADA.</div>', " ", "bottom right"], (error, results) => {
        //         if (error) reject(error);
        //         else resolve(results);
        //     });
        // });
        // CONSULTA DE SELECT - TCR_INGRESOSBANCOS
        const select_tcr_ingresosbancos = await new Promise((resolve, reject) => {
            const sql_tcr_ingresosbancos = `SELECT 
                    * 
                FROM tcr_ingresosbancos
                WHERE id NOT IN (SELECT ingresosbancos_id FROM tcr_ingresosbancos_segmentos) AND status_alta = 2`;

            connection.query(sql_tcr_ingresosbancos, (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });



        // DATOS A MANDAR AL CLIENTE
        // let data_return = {
        //     reporte_banco: select_tcr_ingresosbancos
        // };

        return select_tcr_ingresosbancos;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getReportesBancos
};