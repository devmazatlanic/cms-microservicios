const { connection } = require('../helpers/db_connection');
const db = require('../databases/config');

const procesure_getDatosGeneralesEventosById = async (evento_id) => {
    try {
        // CONSULTA DE PROCEDIMIENTO ALMACENADO
        const procesure_result = await new Promise((resolve, reject) => {
            const sql = `CALL getDatosGeneralesEventosById(?)`;

            connection.query(sql, [evento_id], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return procesure_result;
    } catch (error) {
        throw error;
    }
};

const web_today = async () => {
    try {
        const query_result = await new Promise((resolve, reject) => {
            const query = 'SELECT evento, DATE_FORMAT(fecha_inicio, "%d/%m/%Y") AS fecha, fecha_inicio, fecha_final, descripcion, image, salones FROM web_events WHERE status_alta = 1 AND fecha_inicio < DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND NOW() < fecha_final ORDER BY fecha_inicio';
            connection.query(query, (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return query_result;
    } catch (error) {
        throw error;
    }
}

const web_upcoming = async () => {
    try {
        const query_result = await new Promise((resolve, reject) => {
            const query = 'SELECT evento,DATE_FORMAT(fecha_inicio, "%d/%m/%Y") AS fecha, fecha_inicio, fecha_final, descripcion, image, salones FROM web_events WHERE status_alta = 1 AND DATE(fecha_inicio) > CURRENT_DATE() ORDER BY fecha_inicio';
            connection.query(query, (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return query_result;
    } catch (error) {
        throw error;
    }
}

const stripTags = (value) => String(value ?? '').replace(/<[^>]*>/g, '');

const normalizeText = (value, uppercase = true) => {
    const normalized = stripTags(value).trim().replace(/\s+/g, ' ');
    return uppercase ? normalized.toUpperCase() : normalized;
};

const normalizeMultiline = (value) => stripTags(value)
    .replace(/\r\n|\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const normalizeEmail = (value) => stripTags(value).trim().toLowerCase();

const normalizePhone = (value) => stripTags(value)
    .replace(/[^0-9+\-() ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizePhoneDigits = (value) => String(value || '').replace(/\D+/g, '');

const getPhoneVariants = (value) => {
    const digits = normalizePhoneDigits(value).replace(/^0+/, '');

    if (digits.length === 10) {
        return [digits, `52${digits}`, `521${digits}`];
    }

    if (digits.length === 12 && digits.startsWith('52')) {
        const localDigits = digits.slice(2);
        return [localDigits, digits, `521${localDigits}`];
    }

    if (digits.length === 13 && digits.startsWith('521')) {
        const localDigits = digits.slice(3);
        return [localDigits, `52${localDigits}`, digits];
    }

    return digits ? [digits] : [];
};

const parseLeadPayload = (value) => {
    if (typeof value !== 'string' || value.trim() === '') {
        return {};
    }

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_error) {
        return {};
    }
};

const getModeContact = async (query, modeId) => {
    const rows = await query(`
        SELECT
            cat_idModoContacto AS id,
            TRIM(cat_nombreContacto) AS nombre
        FROM cat_modocontacto
        WHERE cat_idModoContacto = ?
          AND cat_statusAlta = 1
        LIMIT 1
    `, [modeId]);

    return rows[0] || null;
};

const getCommercialDirector = async (query) => {
    const rows = await query(`
        SELECT
            tcr_usuarios.usu_idUsuario AS id_usuario,
            CONCAT_WS(' ', perfiles.nombre, perfiles.apellido_paterno, perfiles.apellido_materno) AS nombre,
            perfiles.celular,
            perfiles.telefono
        FROM tcr_usuarios
        JOIN perfiles ON perfiles.id_perfil = tcr_usuarios.usu_idPerfil
        WHERE tcr_usuarios.usu_status = 1
          AND tcr_usuarios.usu_idPuesto = 5
          AND perfiles.status_alta = 1
        ORDER BY tcr_usuarios.usu_idUsuario ASC
        LIMIT 1
    `);

    return rows[0] || null;
};

const phoneDigitsSql = (expression) => `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${expression}, ' ', ''), '-', ''), '(', ''), ')', ''), '+', ''), '.', '')`;
const jsonEmailSql = `IF(JSON_VALID(ts.comentario), COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ts.comentario, '$.email')), ''), '')`;
const jsonPhoneSql = phoneDigitsSql(`IF(JSON_VALID(ts.comentario), COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ts.comentario, '$.celular')), ''), '')`);

const findActiveLeadFollowup = async (query, email, phone) => {
    const conditions = [];
    const params = [];
    const phoneVariants = getPhoneVariants(phone);

    if (email) {
        conditions.push(`(
            LOWER(TRIM(COALESCE(lpc.lpc_correo, ''))) = ?
            OR LOWER(TRIM(${jsonEmailSql})) = ?
        )`);
        params.push(email, email);
    }

    if (phoneVariants.length > 0) {
        const contactPhoneSql = phoneDigitsSql("COALESCE(lpc.lpc_celular, '')");
        const contactTelephoneSql = phoneDigitsSql("COALESCE(lpc.lpc_telefono, '')");
        const phonePlaceholders = phoneVariants.map(() => '?').join(', ');

        conditions.push(`(
            ${contactPhoneSql} IN (${phonePlaceholders})
            OR ${contactTelephoneSql} IN (${phonePlaceholders})
            OR ${jsonPhoneSql} IN (${phonePlaceholders})
        )`);
        params.push(...phoneVariants, ...phoneVariants, ...phoneVariants);
    }

    if (conditions.length === 0) {
        return null;
    }

    const rows = await query(`
        SELECT
            ts.id,
            ts.id_referencia,
            ts.id_quienregistro,
            ts.id_cuenta,
            ts.id_contacto,
            ts.id_statuslpc,
            ts.id_tabla,
            ts.tabla,
            ts.fecha_estimada,
            ts.comentario
        FROM tcr_seguimientos ts
        LEFT JOIN tcr_lpcs lpc ON lpc.lpc_idLpc = ts.id_contacto
        WHERE ts.status_alta = 1
          AND (ts.id_statuslpc IS NULL OR ts.id_statuslpc NOT IN (11, 14, 15))
          AND (${conditions.join(' OR ')})
        ORDER BY ts.id DESC
        LIMIT 1
        FOR UPDATE
    `, params);

    return rows[0] || null;
};

const buildLeadPayload = (data, mode, previous = {}) => {
    const normalizedEmail = normalizeEmail(data.correo);
    const normalizedPhone = normalizePhone(data.celular);
    const normalizedComment = normalizeMultiline(data.comentario);

    return {
        ...previous,
        id_modo_contacto: Number(mode.id),
        modo_contacto: normalizeText(mode.nombre),
        nombre: normalizeText(data.nombre) || previous.nombre || null,
        apellido_paterno: normalizeText(data.apellido_paterno) || previous.apellido_paterno || null,
        apellido_materno: normalizeText(data.apellido_materno) || previous.apellido_materno || null,
        celular: normalizedPhone || previous.celular || null,
        email: normalizedEmail || previous.email || null,
        cuenta: previous.cuenta || null,
        evento: previous.evento || null,
        pax: previous.pax || null,
        fecha_tentativa: previous.fecha_tentativa || null,
        asunto: normalizedComment || previous.asunto || null
    };
};

const web_contactus = async (_data = {}) => {
    const data = _data && typeof _data === 'object' && !Array.isArray(_data) ? _data : {};
    const normalizedName = normalizeText(data.nombre);
    const normalizedEmail = normalizeEmail(data.correo);
    const normalizedPhone = normalizePhone(data.celular);
    const normalizedComment = normalizeMultiline(data.comentario);

    if (!normalizedName || (!normalizedEmail && !normalizedPhone) || !normalizedComment) {
        const validationError = new Error('Faltan datos requeridos: nombre, correo o celular y comentario.');
        validationError.statusCode = 400;
        throw validationError;
    }

    const rawType = data.tipo === undefined || data.tipo === null
        ? ''
        : String(data.tipo).trim();
    const requestedType = rawType === '' ? 6 : Number(rawType);

    if (!Number.isInteger(requestedType) || requestedType <= 0) {
        const typeError = new Error('El tipo de contacto no es valido.');
        typeError.statusCode = 400;
        throw typeError;
    }

    return db.transaction(async ({ query }) => {
        const mode = await getModeContact(query, requestedType);
        if (!mode) {
            const modeError = new Error('El modo de contacto no existe o no esta activo.');
            modeError.statusCode = 400;
            throw modeError;
        }

        const director = await getCommercialDirector(query);
        const activeFollowup = await findActiveLeadFollowup(query, normalizedEmail, normalizedPhone);
        const directorId = director?.id_usuario || null;

        if (activeFollowup) {
            const referenceId = Number(activeFollowup.id_referencia) > 0
                ? Number(activeFollowup.id_referencia)
                : Number(activeFollowup.id);
            const previousPayload = parseLeadPayload(activeFollowup.comentario);
            const payload = buildLeadPayload(data, mode, previousPayload);
            const ownerId = activeFollowup.id_quienregistro || directorId;

            await query(`
                UPDATE tcr_seguimientos
                SET status_alta = 3,
                    id_quienedito = ?
                WHERE id = ?
                  AND status_alta = 1
            `, [directorId || ownerId, activeFollowup.id]);

            const result = await query(`
                INSERT INTO tcr_seguimientos
                    (id_referencia, id_quienregistro, id_cuenta, id_contacto, id_statuslpc,
                     id_tabla, tabla, origen_registro, status_alta, fecha_estimada, comentario)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'SISTEMA', 1, ?, ?)
            `, [
                referenceId,
                ownerId,
                activeFollowup.id_cuenta || null,
                activeFollowup.id_contacto || null,
                activeFollowup.id_statuslpc || 1,
                activeFollowup.id_tabla || null,
                activeFollowup.tabla || null,
                activeFollowup.fecha_estimada || null,
                JSON.stringify(payload)
            ]);

            return {
                next: true,
                message: 'SU MENSAJE FUE REGISTRADO CORRECTAMENTE, MUY PRONTO LO CONTACTAREMOS.',
                id: result.insertId,
                reference_id: referenceId,
                is_new_thread: false,
                director,
                payload
            };
        }

        const payload = buildLeadPayload(data, mode);
        const result = await query(`
            INSERT INTO tcr_seguimientos
                (id_quienregistro, id_statuslpc, origen_registro, status_alta, comentario)
            VALUES (?, 1, 'SISTEMA', 1, ?)
        `, [directorId, JSON.stringify(payload)]);

        return {
            next: true,
            message: 'SU REGISTRO FUE UN EXITO, MUCHAS GRACIAS POR CONFIAR EN NOSOTROS, MUY PRONTO LO CONTACTAREMOS.',
            id: result.insertId,
            reference_id: result.insertId,
            is_new_thread: true,
            director,
            payload
        };
    });
};

module.exports = {
    procesure_getDatosGeneralesEventosById,
    web_today,
    web_upcoming,
    web_contactus
};
