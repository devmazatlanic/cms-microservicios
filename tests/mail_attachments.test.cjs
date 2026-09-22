const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const projectRequire = createRequire(path.join(root, 'package.json'));
const env = { MAIL_HOST: 'mock', MAIL_USER: 'mock', MAIL_PASS: 'mock', INTERNAL_API_KEY: 'local-test-only' };
function load(relative, overrides = {}) {
    const filename = path.join(root, relative);
    const localRequire = createRequire(filename);
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
        module, exports: module.exports, Buffer, URL,
        console: { log() {}, warn() {}, error() {} }, process: { env },
        require: (name) => Object.hasOwn(overrides, name) ? overrides[name] : localRequire(name)
    }, { filename });
    return module.exports;
}
const helper = projectRequire('./helpers/mail_attachments');
const auth = load('helpers/internal_api_key.js');
let sent = [];
let smtpFailure = false;
const mail = load('config/mail.js', {
    nodemailer: { createTransport: () => ({ sendMail: async (options) => {
        if (smtpFailure) throw new Error('SMTP simulado no disponible');
        sent.push(options); return { response: 'mock accepted' };
    } }) },
    '../config/plantillas': { getSimpleNotification: async () => '<img src="cid:logoMIC">' }
});
const controller = load('controllers/mail.js', { '../config/mail': mail });
const Server = load('config/server.js', { '../helpers/internal_api_key': auth });
const express = projectRequire('express');
const fixture = Object.create(Server.prototype);
fixture.app = express(); fixture.mail_path = '/api/mail'; fixture.apiCorsOrigins = [];
fixture.forceHttps = false; fixture.enableIpDeviceRoute = false;
fixture.middlewares();
fixture.app.post('/api/mail/simple', auth.requireInternalApiKey, controller.post_simple_notification);
fixture.app.post('/other', (req, res) => res.json({ ok: true }));
fixture.app.use((err, req, res, next) => res.status(err.status || 500).json({ next: false }));
const base = { to: 'test@example.invalid', name: 'Test', comment: 'Test' };
const attachment = (buffer) => ({ filename: 'prueba.xlsx', content: buffer.toString('base64'), encoding: 'base64', contentType: 'application/octet-stream' });
(async () => {
    const server = fixture.app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.on('listening', resolve));
    async function post(body, route = '/api/mail/simple', key = env.INTERNAL_API_KEY) {
        return fetch(`http://127.0.0.1:${server.address().port}${route}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key },
            body: typeof body === 'string' ? body : JSON.stringify(body)
        });
    }
    try {
        assert.equal((await post(base)).status, 200);
        assert.equal(sent[0].attachments.length, 1);
        assert.equal(sent[0].attachments[0].cid, 'logoMIC');
        console.log('OK correo legacy: conserva logo y respuesta');
        const binary = Buffer.from([0, 255, 128, 1]);
        assert.equal((await post({ ...base, attachments: [attachment(binary)] })).status, 200);
        assert.deepEqual(sent[1].attachments[1].content, binary);
        assert.equal(sent[1].attachments[0].cid, 'logoMIC');
        console.log('OK controller -> mail -> SMTP simulado: binario y logo');
        const big = attachment(Buffer.alloc(helper.MAX_ATTACHMENT_BYTES));
        assert.equal((await post({ ...base, attachments: [big] })).status, 200);
        console.log('OK 10 MiB binarios cruzan parser y transporte');
        const before = sent.length;
        for (const attachments of [
            [big, attachment(Buffer.from('x'))],
            [attachment(Buffer.alloc(helper.MAX_ATTACHMENT_BYTES + 1))],
            [{ filename: 'x', content: '!!!!', encoding: 'base64' }],
            [{ filename: 'x', content: 'AB==', encoding: 'base64' }],
            [{ filename: 'x', path: 'file:///etc/passwd' }],
            [{ ...attachment(binary), filename: '../x' }],
            [{ ...attachment(binary), contentType: 'text/plain\r\nx: y' }],
            'not-an-array'
        ]) assert.equal((await post({ ...base, attachments })).status, 400);
        assert.equal(sent.length, before);
        console.log('OK exceso, base64 invalido, rutas y nombres: rechazo antes de SMTP');
        assert.equal((await post({ x: 'x'.repeat(110 * 1024) }, '/other')).status, 413);
        assert.equal((await post(base, '/api/mail/simple', 'invalid')).status, 401);
        assert.equal((await post('{bad')).status, 400);
        assert.equal((await post({ ...base, comment: 'x'.repeat(16 * 1024 * 1024) })).status, 413);
        console.log('OK otras rutas 100 KB, autenticacion, JSON invalido y limite HTTP');
        smtpFailure = true;
        const failed = await post(base);
        assert.equal(failed.status, 500);
        assert.equal((await failed.json()).next, false);
        console.log('OK error SMTP devuelve next=false');
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
