const { connection } = require('../helpers/db_connection');

const normalizePhoneDigits = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  return digits.length > 10 ? digits.slice(-10) : digits;
};

const getUsuarioIdByPhoneNumber = async ({ phone_number }) => {
  const normalizedPhone = normalizePhoneDigits(phone_number);

  if (!normalizedPhone) {
    return null;
  }

  const queryResult = await new Promise((resolve, reject) => {
    const sql = `
      SELECT
        tcr_usuarios.usu_idUsuario AS id_usuario
      FROM tcr_usuarios
      JOIN perfiles ON perfiles.id_perfil = tcr_usuarios.usu_idPerfil
      WHERE perfiles.celular IS NOT NULL
        AND perfiles.celular <> ''
        AND RIGHT(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(perfiles.celular, ' ', ''),
                '-', ''),
              '(', ''),
            ')', ''),
          '+', ''),
        10) = ?
      LIMIT 1
    `;

    connection.query(sql, [normalizedPhone], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });

  if (!Array.isArray(queryResult) || queryResult.length === 0) {
    return null;
  }

  const idUsuario = Number(queryResult[0]?.id_usuario);
  return Number.isFinite(idUsuario) ? idUsuario : null;
};

const getAuthRequestById = async ({ id_auth_request }) => {
  const queryResult = await new Promise((resolve, reject) => {
    const sql = `
      SELECT
        id,
        tabla,
        accion,
        estado
      FROM tcr_auth_requests
      WHERE id = ?
      LIMIT 1
    `;

    connection.query(sql, [id_auth_request], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });

  if (!Array.isArray(queryResult) || queryResult.length === 0) {
    return null;
  }

  return queryResult[0];
};

const getLatestAuthRequestApproverRecord = async ({ id_auth_request, id_usuario }) => {
  const queryResult = await new Promise((resolve, reject) => {
    const sql = `
      SELECT
        id,
        estado
      FROM tcr_auth_request_approvers
      WHERE id_auth_request = ?
        AND id_usuario = ?
      ORDER BY id DESC
      LIMIT 1
    `;

    connection.query(sql, [id_auth_request, id_usuario], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });

  if (!Array.isArray(queryResult) || queryResult.length === 0) {
    return null;
  }

  return queryResult[0];
};

const submitAuthRequestApproverDecision = async ({
  id_auth_request,
  id_usuario,
  phone_number,
  comentario,
  estado
}) => {
  const normalizedIdAuthRequest = Number(id_auth_request);

  if (!Number.isFinite(normalizedIdAuthRequest)) {
    throw new Error('El id_auth_request no tiene un formato valido.');
  }

  let resolvedUserId = Number(id_usuario);
  if (!Number.isFinite(resolvedUserId)) {
    resolvedUserId = await getUsuarioIdByPhoneNumber({ phone_number });
  }

  if (!Number.isFinite(resolvedUserId)) {
    throw new Error('No se pudo identificar el usuario que responde la solicitud.');
  }

  const resolvedEstado = Number(estado);
  if (!Number.isFinite(resolvedEstado)) {
    throw new Error('El estado de la decision no es valido.');
  }

  const authRequest = await getAuthRequestById({ id_auth_request: normalizedIdAuthRequest });
  if (!authRequest) {
    const error = new Error('No existe la solicitud de autorizacion indicada.');
    error.code = 'AUTH_REQUEST_NOT_FOUND';
    throw error;
  }

  const existing = await getLatestAuthRequestApproverRecord({
    id_auth_request: normalizedIdAuthRequest,
    id_usuario: resolvedUserId
  });

  if (existing && Number(existing.estado) !== 0) {
    return {
      action: 'already_decided',
      id_usuario: resolvedUserId,
      id_auth_request: normalizedIdAuthRequest,
      existing_estado: Number(existing.estado)
    };
  }

  if (existing && Number(existing.estado) === 0) {
    const updateResult = await new Promise((resolve, reject) => {
      const sql = `
        UPDATE tcr_auth_request_approvers
        SET comentario = ?, estado = ?
        WHERE id_auth_request = ?
          AND id_usuario = ?
          AND estado = 0
      `;

      connection.query(sql, [comentario || null, resolvedEstado, normalizedIdAuthRequest, resolvedUserId], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    return {
      action: 'updated',
      id_usuario: resolvedUserId,
      id_auth_request: normalizedIdAuthRequest,
      affectedRows: updateResult?.affectedRows ?? null
    };
  }

  const insertResult = await new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO tcr_auth_request_approvers (id_auth_request, id_usuario, comentario, estado)
      VALUES (?, ?, ?, ?)
    `;

    connection.query(sql, [normalizedIdAuthRequest, resolvedUserId, comentario || null, resolvedEstado], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });

  return {
    action: 'inserted',
    id_usuario: resolvedUserId,
    id_auth_request: normalizedIdAuthRequest,
    insertId: insertResult?.insertId ?? null
  };
};

module.exports = {
  normalizePhoneDigits,
  getUsuarioIdByPhoneNumber,
  getAuthRequestById,
  submitAuthRequestApproverDecision
};

