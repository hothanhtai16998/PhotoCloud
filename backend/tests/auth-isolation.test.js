import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { requestDeduplication } from '../src/middlewares/requestDeduplication.js';
import { setCacheHeaders } from '../src/middlewares/cacheHeaders.js';

test('identities and refresh cookies never share responses before authentication', async () => {
    const app = express(); app.use(express.json()); app.use(requestDeduplication); app.use(setCacheHeaders);
    app.get('/users/me', (req, res) => res.json({ user: req.headers.authorization }));
    app.post('/auth/refresh', (req, res) => res.json({ session: req.headers.cookie }));
    let calls = 0;
    app.post('/auth/signin', (req, res) => { calls++;res.cookie('refreshToken', String(calls));res.json({ user: req.body.username }); });
    const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    try {
        const [member, admin] = await Promise.all(['member','admin'].map(id => fetch(`${url}/users/me`, { headers: { Authorization: `Bearer ${id}` } })));
        assert.deepEqual(await member.json(), { user: 'Bearer member' });
        assert.deepEqual(await admin.json(), { user: 'Bearer admin' });
        assert.match(admin.headers.get('cache-control'), /no-store/);
        for (const id of ['member','admin']) {
            const response = await fetch(`${url}/auth/refresh`, { method: 'POST', headers: { Cookie: `refreshToken=${id}` } });
            assert.deepEqual(await response.json(), { session: `refreshToken=${id}` });
        }
        for (let i = 0; i < 2; i++) {
            const response = await fetch(`${url}/auth/signin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin' }) });
            assert.ok(response.headers.get('set-cookie'), 'Every login response retains Set-Cookie');
        }
        assert.equal(calls, 2, 'POST authentication must never replay JSON from another request');
    } finally { await new Promise(resolve => server.close(resolve)); }
});
