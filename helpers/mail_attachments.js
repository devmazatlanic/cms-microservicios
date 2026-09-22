const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const invalidAttachment = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
};

// Solo contenido inline: nunca propagar path, href, cid o headers del cliente.
const parseMailAttachments = (attachments) => {
    if (attachments == null) return [];
    if (!Array.isArray(attachments)) {
        throw invalidAttachment('La lista de adjuntos no es valida.');
    }
    let total = 0;
    return attachments.map((attachment) => {
        if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
            throw invalidAttachment('El adjunto no es valido.');
        }
        const { filename, content, encoding, contentType } = attachment;
        if (typeof filename !== 'string' || !filename.trim() ||
            filename === '.' || filename === '..' || /[\x00-\x1f\x7f/\\]/.test(filename)) {
            throw invalidAttachment('El nombre del adjunto no es valido.');
        }
        if (encoding !== 'base64' || typeof content !== 'string' ||
            content.length > 4 * Math.ceil((MAX_ATTACHMENT_BYTES - total) / 3)) {
            throw invalidAttachment('Adjunto invalido o limite total de 10 MB excedido.');
        }
        // Buffer.from tolera base64 corrupto; exigir formato canonico primero.
        if (content.length % 4 !== 0 ||
            /[^A-Za-z0-9+/=]/.test(content)) {
            throw invalidAttachment('El contenido base64 del adjunto no es valido.');
        }
        const buffer = Buffer.from(content, 'base64');
        if (buffer.toString('base64') !== content) {
            throw invalidAttachment('El contenido base64 del adjunto no es valido.');
        }
        total += buffer.length;
        if (total > MAX_ATTACHMENT_BYTES) {
            throw invalidAttachment('Los adjuntos superan el limite total de 10 MB.');
        }
        if (contentType != null && (typeof contentType !== 'string' ||
            !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(contentType))) {
            throw invalidAttachment('El tipo de contenido del adjunto no es valido.');
        }
        return {
            filename,
            content: buffer,
            contentType: contentType || 'application/octet-stream'
        };
    });
};

module.exports = { parseMailAttachments, MAX_ATTACHMENT_BYTES };
