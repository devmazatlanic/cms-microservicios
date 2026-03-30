const db = require('../databases/config');

const resolveQueryTarget = () => {
    if (db?.connection && typeof db.connection.query === 'function') {
        return {
            context: db.connection,
            query: db.connection.query
        };
    }

    if (db && typeof db.query === 'function') {
        return {
            context: db,
            query: db.query
        };
    }

    return null;
};

const connection = {
    query(sql, params, callback) {
        let normalizedParams = params;
        let normalizedCallback = callback;

        if (typeof normalizedParams === 'function') {
            normalizedCallback = normalizedParams;
            normalizedParams = [];
        }

        const target = resolveQueryTarget();

        if (!target) {
            const error = new Error('La configuracion de base de datos no expone un adaptador compatible con query().');
            if (typeof normalizedCallback === 'function') {
                return normalizedCallback(error);
            }
            throw error;
        }

        try {
            if (target.query.length >= 3) {
                return target.query.call(target.context, sql, normalizedParams, normalizedCallback);
            }

            const result = target.query.call(target.context, sql, normalizedParams);

            if (result && typeof result.then === 'function') {
                return result
                    .then((rows) => normalizedCallback(null, rows))
                    .catch((error) => normalizedCallback(error));
            }

            return normalizedCallback(null, result);
        } catch (error) {
            return normalizedCallback(error);
        }
    }
};

module.exports = {
    connection
};
