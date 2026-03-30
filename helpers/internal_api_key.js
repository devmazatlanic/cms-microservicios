const getRequestApiKey = (request) => {
    const headerApiKey = String(request.headers['x-api-key'] || '').trim();
    if (headerApiKey) {
        return headerApiKey;
    }

    const authorization = String(request.headers.authorization || '').trim();
    if (authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.slice(7).trim();
    }

    return '';
};

const requireInternalApiKey = (request, response, next) => {
    const expectedApiKey = String(process.env.INTERNAL_API_KEY || '').trim();

    if (!expectedApiKey) {
        console.error('[AUTH] INTERNAL_API_KEY no configurada.');
        return response.status(503).json({
            next: false,
            message: 'SERVICIO INTERNO NO CONFIGURADO.'
        });
    }

    const requestApiKey = getRequestApiKey(request);
    if (!requestApiKey || requestApiKey !== expectedApiKey) {
        return response.status(401).json({
            next: false,
            message: 'NO AUTORIZADO.'
        });
    }

    return next();
};

module.exports = {
    requireInternalApiKey
};
