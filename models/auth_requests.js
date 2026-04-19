const { connection } = require('../helpers/db_connection');

const toFiniteNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
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

const updateAuthRequestApproverDecision = async ({ id, comentario, estado }) => {
  const updateResult = await new Promise((resolve, reject) => {
    const sql = `
      UPDATE tcr_auth_request_approvers
      SET comentario = ?, estado = ?
      WHERE id = ?
        AND estado = 0
    `;

    connection.query(sql, [comentario || null, estado, id], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });

  return updateResult;
};

const insertAuthRequestApproverDecision = async ({ id_auth_request, id_usuario, comentario, estado }) => {
  const insertResult = await new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO tcr_auth_request_approvers (id_auth_request, id_usuario, comentario, estado)
      VALUES (?, ?, ?, ?)
    `;

    connection.query(sql, [id_auth_request, id_usuario, comentario || null, estado], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });

  return insertResult;
};

const submitAuthRequestApproverDecision = async ({
  id_auth_request,
  id_usuario,
  comentario,
  estado
}) => {
  const normalizedIdAuthRequest = toFiniteNumber(id_auth_request);
  if (normalizedIdAuthRequest === null) {
    const error = new Error('El id_auth_request no tiene un formato valido.');
    error.code = 'AUTH_REQUEST_INVALID';
    throw error;
  }

  const resolvedUserId = toFiniteNumber(id_usuario);
  if (resolvedUserId === null) {
    const error = new Error('El id_usuario no tiene un formato valido.');
    error.code = 'AUTH_USER_INVALID';
    throw error;
  }

  const resolvedEstado = toFiniteNumber(estado);
  if (resolvedEstado === null || ![1, -1].includes(resolvedEstado)) {
    const error = new Error('El estado de la decision no es valido.');
    error.code = 'AUTH_DECISION_INVALID';
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
    const updateResult = await updateAuthRequestApproverDecision({
      id: existing.id,
      comentario,
      estado: resolvedEstado
    });

    return {
      action: 'updated',
      id_usuario: resolvedUserId,
      id_auth_request: normalizedIdAuthRequest,
      approver_record_id: existing.id,
      affectedRows: updateResult?.affectedRows ?? null
    };
  }

  const insertResult = await insertAuthRequestApproverDecision({
    id_auth_request: normalizedIdAuthRequest,
    id_usuario: resolvedUserId,
    comentario,
    estado: resolvedEstado
  });

  return {
    action: 'inserted',
    id_usuario: resolvedUserId,
    id_auth_request: normalizedIdAuthRequest,
    insertId: insertResult?.insertId ?? null
  };
};

module.exports = {
  submitAuthRequestApproverDecision
};
