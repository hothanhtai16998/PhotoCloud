import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import realAxios from 'axios';
import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';
const owner = '000000000000000000000001', viewer = '000000000000000000000002';
const id = '000000000000000000000003';
let collection, projection, notifications, downloads, failDownloads, fetchImage, dnsRecords, dnsError, pendingCollection;
mock.module('node:dns', { namedExports: {
    lookup: (_hostname, _options, callback) => queueMicrotask(() => callback(dnsError, dnsRecords)),
} });
function matches(row, query) {
    return Object.entries(query).every(([key, value]) => {
        if (key === '$or') return value.some(part => matches(row, part));
        if (key === 'createdBy') return (row.createdBy?._id || row.createdBy) === value;
        if (key === 'collaborators.user') return (row.collaborators || []).some(entry => entry.user === value);
        if (value?.$exists !== undefined) return Object.hasOwn(row, key) === value.$exists;
        return value === null ? row[key] == null : row[key] === value;
    });
}
mock.module('../src/models/Collection.js', { defaultExport: {
    findOne(query) {
        let value = matches(collection, query) ? { ...collection } : null;
        return {
            populate(options) {
                if (options?.path === 'images') {
                    projection = options;
                    if (value) value.images = value.images.filter(image => matches(image, options.match));
                }
                return this;
            },
            lean: async () => value,
            then(resolve, reject) { return Promise.resolve(pendingCollection || value).then(resolve, reject); },
        };
    },
} });
mock.module('../src/models/Notification.js', { defaultExport: { create: async data => notifications.push(data) } });
mock.module('axios', { defaultExport: { get: async (url, options) => { downloads.push(url); if (fetchImage) return fetchImage(url, options); if (failDownloads) throw new Error('fixture download failure'); return { data: Buffer.from(url) }; } } });
const { exportCollection, trackCollectionShare } = await import('../src/controllers/collection/collectionExportController.js');
function reset() {
    notifications = []; downloads = []; projection = null; failDownloads = false; fetchImage = null; dnsError = null; pendingCollection = null; dnsRecords = [{ address: '8.8.8.8', family: 4 }];
    collection = { _id: id, name: 'fixture', createdBy: owner, isPublic: true, images: [] };
}
function invoke(handler, user = viewer, origin) {
    return new Promise((resolve, reject) => {
        const res = Object.assign(new EventEmitter(), { code: 200, headers: {}, status(code) { this.code = code; return this; },
            setHeader(name, value) { this.headers[name] = value; }, json(body) { resolve({ ...this, body }); },
            send(body) { resolve({ ...this, body }); } });
        Promise.resolve(handler({ params: { collectionId: id }, user: { _id: user }, headers: { origin } }, res, reject)).catch(reject);
    });
}
test('ZIP retains images with equal sanitized titles and never fetches unpublished images', async () => {
    reset();
    collection.images = [
        { imageTitle: 'Same!', imageUrl: 'https://example.test/a.jpg', moderationStatus: 'approved' },
        { imageTitle: 'Same?', imageUrl: 'https://example.test/b.jpg' },
        { imageTitle: 'hidden', imageUrl: 'https://example.test/private.jpg', moderationStatus: 'pending' },
    ];
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
    const zip = await JSZip.loadAsync(response.body);
    assert.equal(Object.keys(zip.files).length, 2);
    assert.equal(downloads.length, 2);
    assert.equal(response.headers['X-Export-Total'], 2);
    assert.equal(response.headers['X-Export-Downloaded'], 2);
    assert.match(response.headers['Access-Control-Expose-Headers'], /X-Export-Downloaded/);
    assert.ok(projection.match);
    assert.equal(await zip.file('1_same_.jpg').async('string'), 'https://example.test/a.jpg');
    assert.equal(await zip.file('2_same_.jpg').async('string'), 'https://example.test/b.jpg');
});
test('sharing a private collection without access cannot create a notification', async () => {
    reset(); collection.isPublic = false;
    assert.equal((await invoke(trackCollectionShare)).code, 404);
    assert.deepEqual(notifications, []);
    collection.collaborators = [{ user: viewer }];
    assert.equal((await invoke(trackCollectionShare)).code, 200);
    assert.equal(notifications.length, 1);
});
test('public sharing tolerates deleted owners and own shares do not notify', async () => {
    reset(); collection.createdBy = null;
    assert.equal((await invoke(trackCollectionShare)).code, 200);
    assert.deepEqual(notifications, []);
    reset();
    assert.equal((await invoke(trackCollectionShare, owner)).code, 200);
    assert.deepEqual(notifications, []);
});

test('all image fetches failing returns 502 instead of a successful empty ZIP', async () => {
    reset(); failDownloads = true;
    collection.images = [{ imageTitle: 'fixture', imageUrl: 'https://example.test/a.jpg' }];
    const response = await invoke(exportCollection);
    assert.equal(response.code, 502);
    assert.equal(response.body.success, false);
});


test('ZIP preserves middleware CORS and private cache policy', async () => {
    reset();
    collection.images = [{ imageUrl: 'https://example.test/a.jpg' }];
    const response = await new Promise((resolve, reject) => {
        const res = Object.assign(new EventEmitter(), {
            headers: { 'Cache-Control': 'private, no-store', 'Access-Control-Allow-Origin': 'https://allowed.test' },
            setHeader(name, value) { this.headers[name] = value; },
            status() { return this; },
            send(body) { resolve({ headers: this.headers, body }); },
        });
        exportCollection({ params: { collectionId: id }, user: { _id: owner },
            headers: { origin: 'https://denied.test' } }, res, reject);
    });
    assert.equal(response.headers['Access-Control-Allow-Origin'], 'https://allowed.test');
    assert.equal(response.headers['Access-Control-Allow-Credentials'], undefined);
    assert.equal(response.headers['Cache-Control'], 'private, no-store');
    assert.equal(response.headers['Content-Type'], 'application/zip');
});

test('export keeps owner/public access and denies private outsider and collaborator', async () => {
    reset();
    collection.isPublic = false;
    collection.images = [{ imageUrl: 'https://example.test/a.jpg' }];
    assert.equal((await invoke(exportCollection)).code, 404);
    collection.collaborators = [{ user: viewer }];
    assert.equal((await invoke(exportCollection)).code, 404);
    assert.deepEqual(downloads, []);
    assert.equal((await invoke(exportCollection, owner)).code, 200);
});

test('invalid IDs never reach persistence; collections without visible images return 400', async () => {
    reset();
    await new Promise((resolve, reject) => {
        trackCollectionShare({ params: { collectionId: 'invalid' } }, {
            status(code) { assert.equal(code, 400); return this; },
            json() { resolve(); },
        }, reject);
    });
    await new Promise((resolve, reject) => {
        exportCollection({ params: { collectionId: 'invalid' } }, {
            status(code) { assert.equal(code, 400); return this; },
            json() { resolve(); },
        }, reject);
    });
    collection.images = [{ imageUrl: 'https://example.test/hidden.jpg', moderationStatus: 'pending' }];
    assert.equal((await invoke(exportCollection)).code, 400);
    assert.deepEqual(downloads, []);
});

test('bounded workers continue after a failure and retain positional names across waves', async () => {
    reset();
    collection.images = Array.from({ length: 11 }, (_, index) => ({
        imageTitle: 'same', imageUrl: 'https://example.test/' + index + '.jpg',
    }));
    let active = 0, peak = 0;
    fetchImage = async url => {
        active++;
        peak = Math.max(peak, active);
        await new Promise(resolve => setImmediate(resolve));
        active--;
        if (url.endsWith('/2.jpg')) throw new Error('fixture failure');
        return { data: Buffer.from(url) };
    };
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
    assert.equal(response.headers['X-Export-Total'], 11);
    assert.equal(response.headers['X-Export-Downloaded'], 10);
    assert.equal(peak, 4);
    assert.equal(active, 0);
    assert.equal(downloads.length, 11);
    const zip = await JSZip.loadAsync(response.body);
    assert.equal(Object.keys(zip.files).length, 10);
    assert.equal(zip.file('3_same.jpg'), null);
    assert.equal(await zip.file('11_same.jpg').async('string'), 'https://example.test/10.jpg');
});

test('empty download bodies do not create successful empty image entries', async () => {
    reset();
    collection.images = [{ imageUrl: 'https://example.test/empty.jpg' }];
    fetchImage = async () => ({ data: Buffer.alloc(0) });
    assert.equal((await invoke(exportCollection)).code, 502);
});

test('export selects fallback URLs and downloads them when primary URL is missing', async () => {
    reset();
    collection.images = [{ regularUrl: 'https://example.test/regular.webp' },
        { smallUrl: 'https://example.test/small.png' }, {}];
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
    assert.ok(projection.select.includes('regularUrl'));
    assert.ok(projection.select.includes('smallUrl'));
    const zip = await JSZip.loadAsync(response.body);
    assert.equal(Object.keys(zip.files).length, 2);
    assert.equal(await zip.file('1_image_1.webp').async('string'), 'https://example.test/regular.webp');
});

test('disconnect aborts active downloads, stops remaining work and removes the close listener', async () => {
    reset();
    collection.images = Array.from({ length: 12 }, (_, index) => ({ imageUrl: 'https://example.test/' + index + '.jpg' }));
    let cancelled = 0, writes = 0, nextCalls = 0;
    const res = Object.assign(new EventEmitter(), {
        setHeader() { writes++; },
        status() { writes++; return this; },
        send() { writes++; },
        json() { writes++; },
    });
    fetchImage = (url, { signal }) => new Promise((resolve, reject) => {
        assert.equal(signal.aborted, false);
        signal.addEventListener('abort', () => { cancelled++; reject(signal.reason); }, { once: true });
    });
    exportCollection({ params: { collectionId: id }, user: { _id: owner } }, res, () => { nextCalls++; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(downloads.length, 4);
    assert.equal(res.listenerCount('close'), 1);
    res.destroyed = true;
    res.emit('close');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(cancelled, 4);
    assert.equal(downloads.length, 4);
    assert.equal(writes, 0);
    assert.equal(nextCalls, 0);
    assert.equal(res.listenerCount('close'), 0);
});

test('service rejects an already aborted export without starting downloads', async () => {
    reset();
    const { createCollectionExport } = await import('../src/services/collection/collectionExport.js');
    const cancellation = new AbortController();
    cancellation.abort();
    await assert.rejects(createCollectionExport(id, owner, { signal: cancellation.signal }), { name: 'AbortError' });
    assert.deepEqual(downloads, []);
});

test('normal completion removes its close listener without aborting successful downloads', async () => {
    reset();
    collection.images = [{ imageUrl: 'https://example.test/a.jpg' }];
    let downloadSignal;
    fetchImage = async (url, { signal }) => { downloadSignal = signal; return { data: Buffer.from(url) }; };
    const res = Object.assign(new EventEmitter(), {
        setHeader() {},
        status() { return this; },
        send() { this.writableEnded = true; this.emit('close'); },
    });
    let error;
    exportCollection({ params: { collectionId: id }, user: { _id: owner } }, res, value => { error = value; });
    for (let attempt = 0; attempt < 50 && !res.writableEnded; attempt++) {
        await new Promise(resolve => setImmediate(resolve));
    }
    assert.equal(error, undefined);
    assert.equal(res.writableEnded, true);
    assert.equal(downloadSignal.aborted, false);
    assert.equal(res.listenerCount('close'), 0);
});

test('export rejects non-web and credential-bearing sources before downloading', async () => {
    reset();
    collection.images = [
        { imageUrl: 'data:image/jpeg;base64,YQ==' },
        { imageUrl: 'file:///fixture/photo.jpg' },
        { imageUrl: 'ftp://example.test/photo.jpg' },
        { imageUrl: 'https://fixture-user:fixture-password@example.test/photo.jpg' },
        { imageUrl: 'not a URL' },
        { imageUrl: '//example.test/photo.jpg' },
        { imageUrl: 'https://fixture-user@example.test/photo.jpg' },
        { imageUrl: 'https://:fixture-password@example.test/photo.jpg' },
    ];
    const response = await invoke(exportCollection);
    assert.equal(response.code, 502);
    assert.deepEqual(downloads, []);
});

test('unsupported sources do not prevent other web images from being exported', async () => {
    reset();
    collection.images = [
        { imageTitle: 'inline', imageUrl: 'data:image/jpeg;base64,YQ==' },
        { imageTitle: 'web', imageUrl: 'https://example.test/a.jpg' },
        { imageTitle: 'legacy', imageUrl: 'http://example.test/b.jpg' },
    ];
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
    assert.deepEqual(downloads.sort(), ['http://example.test/b.jpg', 'https://example.test/a.jpg']);
    const zip = await JSZip.loadAsync(response.body);
    assert.deepEqual(Object.keys(zip.files).sort(), ['2_web.jpg', '3_legacy.jpg']);
});

test('redirect checks reject credentials and secure-to-insecure hops before following', async () => {
    reset();
    collection.images = [{ imageUrl: 'https://example.test/a.jpg' }];
    fetchImage = async (url, { beforeRedirect }) => {
        for (const href of [
            'data:image/jpeg;base64,YQ==',
            'https://fixture:fixture@example.test/a.jpg',
            'http://example.test/a.jpg',
        ]) {
            assert.throws(() => beforeRedirect({ href }, {}, { url }));
        }
        throw new Error('fixture redirect rejected');
    };
    assert.equal((await invoke(exportCollection)).code, 502);
});

test('redirect checks preserve safe CDN hops, upgrades and proxy transport compatibility', async () => {
    reset();
    collection.images = [{ imageUrl: 'http://example.test/a.jpg' }];
    fetchImage = async (url, { beforeRedirect }) => {
        assert.doesNotThrow(() => beforeRedirect({ href: 'https://cdn.example.test/a.jpg' }, {}, { url }));
        assert.doesNotThrow(() => beforeRedirect({
            href: 'https://cdn.example.test/a.jpg?signature=fixture',
            protocol: 'http:', hostname: 'fixture-proxy',
        }, {}, { url: 'https://example.test/a.jpg' }));
        assert.throws(() => beforeRedirect({ href: 'http://cdn.example.test/a.jpg' }, {},
            { url: 'https://cdn.example.test/a.jpg' }));
        return { data: Buffer.from('fixture image') };
    };
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
});


test('real HTTP redirect transport blocks credential targets and preserves relative image redirects', async () => {
    let blockedTargetHits = 0;
    const server = createServer((req, res) => {
        if (req.url === '/blocked') {
            res.writeHead(302, { Location: 'http://fixture:fixture@' + req.headers.host + '/target' });
        } else if (req.url === '/private') {
            res.writeHead(302, { Location: 'http://127.0.0.1:' + server.address().port + '/target' });
        } else if (req.url === '/safe') {
            res.writeHead(302, { Location: '/image.jpg' });
        } else if (req.url === '/target') {
            blockedTargetHits++;
        } else {
            res.end('fixture image bytes');
            return;
        }
        res.end();
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const base = 'http://fixture.example.test:' + server.address().port;
        reset();
        collection.images = [{ imageUrl: base + '/blocked' }];
        fetchImage = (url, options) => realAxios.get(url, {
            ...options, proxy: false,
            lookup: (_hostname, options, callback) => {
                if (options.all) callback(null, [{ address: '127.0.0.1', family: 4 }]);
                else callback(null, '127.0.0.1', 4);
            },
        });
        assert.equal((await invoke(exportCollection)).code, 502);
        assert.equal(blockedTargetHits, 0);
        collection.images = [{ imageUrl: base + '/private' }];
        assert.equal((await invoke(exportCollection)).code, 502);
        assert.equal(blockedTargetHits, 0);
        collection.images = [{ imageUrl: base + '/safe' }];
        const response = await invoke(exportCollection);
        assert.equal(response.code, 200);
        const zip = await JSZip.loadAsync(response.body);
        assert.equal(await zip.file('1_image_1.jpg').async('string'), 'fixture image bytes');
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});


test('export counts skipped missing sources as failures without claiming a full download', async () => {
    reset();
    collection.images = [
        { imageTitle: 'missing' },
        { imageTitle: 'invalid', imageUrl: 'data:image/jpeg;base64,YQ==' },
        { imageTitle: 'good', imageUrl: 'https://example.test/a.jpg' },
    ];
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
    assert.equal(response.headers['X-Export-Total'], 3);
    assert.equal(response.headers['X-Export-Downloaded'], 1);
    const zip = await JSZip.loadAsync(response.body);
    assert.equal(Object.keys(zip.files).length, response.headers['X-Export-Downloaded']);
});


test('export blocks explicit private, loopback, reserved IPs and localhost before any download', async () => {
    reset();
    const blocked = [
        '127.0.0.1', '2130706433', '0x7f000001', '0177.0.0.1', '0.0.0.0',
        '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1',
        '169.254.169.254', '100.64.0.1', '198.18.0.1', '224.0.0.1', '255.255.255.255',
        'localhost', 'LOCALHOST.', 'images.localhost', '[::1]', '[::]', '[fc00::1]',
        '[fe80::1]', '[ff02::1]', '[::ffff:127.0.0.1]', '[::ffff:7f00:1]', '[2001:db8::1]',
    ];
    collection.images = blocked.map(host => ({ imageUrl: 'http://' + host + '/image.jpg' }));
    assert.equal((await invoke(exportCollection)).code, 502);
    assert.deepEqual(downloads, []);
});

test('public literal IPs remain eligible while redirects to private IPs are rejected', async () => {
    reset();
    collection.images = [
        { imageUrl: 'https://8.8.8.8/image.jpg' },
        { imageUrl: 'https://[2606:4700:4700::1111]/image.jpg' },
    ];
    fetchImage = async (url, { beforeRedirect }) => {
        for (const host of ['127.0.0.1', '192.168.1.1', '[::1]', 'localhost']) {
            assert.throws(() => beforeRedirect({ href: 'https://' + host + '/image.jpg' }, {}, { url }));
        }
        return { data: Buffer.from('fixture bytes') };
    };
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
    assert.equal(response.headers['X-Export-Downloaded'], 2);
});


test('connection lookup rejects private or mixed DNS answers and propagates resolver errors', async () => {
    reset();
    collection.images = [{ imageUrl: 'https://images.example.test/a.jpg' }];
    fetchImage = async (_url, options) => {
        assert.equal(options.proxy, false);
        for (const addresses of [
            [{ address: '127.0.0.1', family: 4 }],
            [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }],
            [{ address: '::ffff:127.0.0.1', family: 6 }],
            [{ address: 'fc00::1', family: 6 }],
            [],
        ]) {
            dnsRecords = addresses;
            await assert.rejects(new Promise((resolve, reject) =>
                options.lookup('images.example.test', { all: true }, (error, value) => error ? reject(error) : resolve(value))));
        }
        dnsError = Object.assign(new Error('fixture DNS failure'), { code: 'ENOTFOUND' });
        await assert.rejects(new Promise((resolve, reject) =>
            options.lookup('images.example.test', {}, (error, value) => error ? reject(error) : resolve(value))), { code: 'ENOTFOUND' });
        throw new Error('fixture blocked');
    };
    assert.equal((await invoke(exportCollection)).code, 502);
});

test('connection lookup returns checked public answers in both Node callback shapes', async () => {
    reset();
    collection.images = [{ imageUrl: 'https://images.example.test/a.jpg' }];
    dnsRecords = [{ address: '8.8.8.8', family: 4 }, { address: '2606:4700:4700::1111', family: 6 }];
    fetchImage = async (_url, { lookup }) => {
        const all = await new Promise((resolve, reject) =>
            lookup('images.example.test', { all: true }, (error, value) => error ? reject(error) : resolve(value)));
        assert.deepEqual(all, dnsRecords);
        const single = await new Promise((resolve, reject) =>
            lookup('images.example.test', {}, (error, address, family) => error ? reject(error) : resolve({ address, family })));
        assert.deepEqual(single, dnsRecords[0]);
        return { data: Buffer.from('fixture bytes') };
    };
    assert.equal((await invoke(exportCollection)).code, 200);
});

test('real socket lookup blocks a hostname resolving to loopback before the server is contacted', async () => {
    let hits = 0;
    const server = createServer((_req, res) => { hits++; res.end('private fixture'); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        reset();
        dnsRecords = [{ address: '127.0.0.1', family: 4 }];
        collection.images = [{ imageUrl: 'http://images.example.test:' + server.address().port + '/image.jpg' }];
        fetchImage = (url, options) => realAxios.get(url, options);
        assert.equal((await invoke(exportCollection)).code, 502);
        assert.equal(hits, 0);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});

test('redirect socket uses the guarded lookup for a new hostname pointing to a private address', async () => {
    let targetHits = 0;
    const server = createServer((req, res) => {
        if (req.url === '/start') {
            res.writeHead(302, { Location: 'http://private.example.test:' + server.address().port + '/target' });
        } else {
            targetHits++;
        }
        res.end('fixture');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        reset();
        dnsRecords = [{ address: '127.0.0.1', family: 4 }];
        collection.images = [{ imageUrl: 'http://start.example.test:' + server.address().port + '/start' }];
        fetchImage = (url, options) => realAxios.get(url, {
            ...options,
            // Only the initial fixture connection is mapped locally; redirect uses production guard.
            lookup: (_hostname, config, callback) => config.all
                ? callback(null, [{ address: '127.0.0.1', family: 4 }])
                : callback(null, '127.0.0.1', 4),
            beforeRedirect: (redirect, response, request) => {
                options.beforeRedirect(redirect, response, request);
                redirect.lookup = options.lookup;
            },
        });
        assert.equal((await invoke(exportCollection)).code, 502);
        assert.equal(targetHits, 0);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});


test('200 error documents are excluded from the ZIP and downloaded count', async () => {
    reset();
    const types = ['text/html; charset=utf-8', 'TEXT/PLAIN', 'application/json', 'application/problem+json',
        'application/xml', 'application/problem+xml'];
    collection.images = types.map((_, index) => ({ imageUrl: 'https://example.test/' + index + '.jpg' }));
    collection.images.push({ imageUrl: 'https://example.test/good.jpg' });
    fetchImage = async url => ({
        data: Buffer.from('fixture body'),
        headers: { 'content-type': url.endsWith('/good.jpg') ? 'image/jpeg' : types[Number(url.split('/').pop().split('.')[0])] },
    });
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
    assert.equal(response.headers['X-Export-Total'], 7);
    assert.equal(response.headers['X-Export-Downloaded'], 1);
    const zip = await JSZip.loadAsync(response.body);
    assert.deepEqual(Object.keys(zip.files), ['7_image_7.jpg']);
});

test('image, video, binary and legacy untyped responses retain their exact bytes', async () => {
    reset();
    const types = ['image/svg+xml', 'image/jpeg', 'video/mp4', 'application/octet-stream', undefined];
    collection.images = types.map((_, index) => ({ imageUrl: 'https://example.test/' + index + '.jpg' }));
    fetchImage = async url => {
        const index = Number(url.split('/').pop().split('.')[0]);
        return { data: Buffer.from('fixture bytes ' + index), headers: { 'content-type': types[index] } };
    };
    const response = await invoke(exportCollection);
    assert.equal(response.headers['X-Export-Downloaded'], 5);
    const zip = await JSZip.loadAsync(response.body);
    for (let index = 0; index < 5; index++) {
        const extension = ['svg', 'jpg', 'mp4', 'jpg', 'jpg'][index];
        assert.equal(await zip.file((index + 1) + '_image_' + (index + 1) + '.' + extension).async('string'), 'fixture bytes ' + index);
    }
});

test('real HTTP 200 HTML error page returns failure rather than a successful image archive', async () => {
    let hits = 0;
    const server = createServer((_req, res) => {
        hits++;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<html><body>Image unavailable</body></html>');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        reset();
        collection.images = [{ imageUrl: 'http://fixture.example.test:' + server.address().port + '/image.jpg' }];
        fetchImage = (url, options) => realAxios.get(url, {
            ...options,
            lookup: (_hostname, config, callback) => config.all
                ? callback(null, [{ address: '127.0.0.1', family: 4 }])
                : callback(null, '127.0.0.1', 4),
        });
        const response = await invoke(exportCollection);
        assert.equal(response.code, 502);
        assert.equal(hits, 1);
        assert.equal(response.headers['Content-Type'], undefined);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});


test('partial image responses do not enter the archive or count as completed downloads', async () => {
    reset();
    collection.images = ['partial', 'range', 'good'].map(name => ({ imageUrl: 'https://example.test/' + name + '.jpg' }));
    fetchImage = async url => ({
        status: url.endsWith('/partial.jpg') ? 206 : 200,
        headers: url.endsWith('/range.jpg') ? { 'content-range': 'bytes 0-2/10' } : { 'content-type': 'image/jpeg' },
        data: Buffer.from('fixture bytes'),
    });
    const response = await invoke(exportCollection);
    assert.equal(response.code, 200);
    assert.equal(response.headers['X-Export-Total'], 3);
    assert.equal(response.headers['X-Export-Downloaded'], 1);
    const zip = await JSZip.loadAsync(response.body);
    assert.deepEqual(Object.keys(zip.files), ['3_image_3.jpg']);
    assert.equal(await zip.file('3_image_3.jpg').async('string'), 'fixture bytes');
});

test('real HTTP partial image is rejected even when it has image content type and nonempty bytes', async () => {
    const server = createServer((_req, res) => {
        res.writeHead(206, { 'Content-Type': 'image/jpeg', 'Content-Range': 'bytes 0-2/10' });
        res.end('abc');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        reset();
        collection.images = [{ imageUrl: 'http://fixture.example.test:' + server.address().port + '/image.jpg' }];
        fetchImage = (url, options) => realAxios.get(url, {
            ...options,
            lookup: (_hostname, config, callback) => config.all
                ? callback(null, [{ address: '127.0.0.1', family: 4 }])
                : callback(null, '127.0.0.1', 4),
        });
        assert.equal((await invoke(exportCollection)).code, 502);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});


test('export deadline cancels downloads and responds once without returning a partial ZIP', async t => {
    reset();
    t.mock.timers.enable({ apis: ['setTimeout'] });
    collection.images = Array.from({ length: 12 }, (_, index) => ({ imageUrl: 'https://example.test/' + index + '.jpg' }));
    let aborted = 0, responses = 0, nextCalls = 0;
    fetchImage = (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => { aborted++; reject(signal.reason); }, { once: true });
    });
    const result = new Promise(resolve => {
        const res = Object.assign(new EventEmitter(), {
            status(code) { this.code = code; return this; },
            json(body) { responses++; this.writableEnded = true; resolve({ code: this.code, body, res: this }); },
            send() { responses++; },
            setHeader() {},
        });
        exportCollection({ params: { collectionId: id }, user: { _id: owner } }, res, () => { nextCalls++; });
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(downloads.length, 4);
    t.mock.timers.tick(110000);
    const response = await result;
    assert.equal(response.code, 504);
    assert.match(response.body.message, /quá lâu/);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(aborted, 4);
    assert.equal(downloads.length, 4);
    assert.equal(responses, 1);
    assert.equal(nextCalls, 0);
    assert.equal(response.res.listenerCount('close'), 0);
});

test('successful export clears deadline and cannot receive a late timeout response', async t => {
    reset();
    t.mock.timers.enable({ apis: ['setTimeout'] });
    collection.images = [{ imageUrl: 'https://example.test/a.jpg' }];
    let responses = 0, downloadSignal;
    fetchImage = async (_url, { signal }) => {
        downloadSignal = signal;
        return { data: Buffer.from('fixture image') };
    };
    await new Promise((resolve, reject) => {
        const res = Object.assign(new EventEmitter(), {
            status(code) { this.code = code; return this; },
            json() { responses++; },
            setHeader() {},
            send() { responses++; resolve(); },
        });
        exportCollection({ params: { collectionId: id }, user: { _id: owner } }, res, reject);
    });
    await new Promise(resolve => setImmediate(resolve));
    t.mock.timers.tick(110000);
    assert.equal(responses, 1);
    assert.equal(downloadSignal.aborted, false);
});

test('deadline responds while collection query is still pending and ignores its late result', async t => {
    reset();
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let release, responses = 0, nextCalls = 0;
    pendingCollection = new Promise(resolve => { release = resolve; });
    const result = new Promise(resolve => {
        const res = Object.assign(new EventEmitter(), {
            status(code) { this.code = code; return this; },
            json(body) { responses++; this.writableEnded = true; resolve({ code: this.code, body, res: this }); },
            send() { responses++; },
            setHeader() {},
        });
        exportCollection({ params: { collectionId: id }, user: { _id: owner } }, res, () => { nextCalls++; });
    });
    await new Promise(resolve => setImmediate(resolve));
    t.mock.timers.tick(110000);
    const response = await result;
    assert.equal(response.code, 504);
    assert.equal(response.res.listenerCount('close'), 0);
    release({ ...collection, images: [{ imageUrl: 'https://example.test/a.jpg' }] });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(responses, 1);
    assert.equal(nextCalls, 0);
    assert.deepEqual(downloads, []);
});


test('archive filenames follow declared media format and never use query or hostname as the extension', async () => {
    reset();
    const cases = [
        ['https://example.test/download?id=1', 'image/png', 'png'],
        ['https://example.test/old.jpg', 'image/webp', 'webp'],
        ['https://example.test/video?id=2', 'video/mp4', 'mp4'],
        ['https://example.test/photo', 'image/avif', 'avif'],
        ['https://example.test/a.PNG?signature=fixture.jpg', undefined, 'png'],
        ['https://example.test', undefined, 'jpg'],
        ['https://example.test/a.webp#download', undefined, 'webp'],
    ];
    collection.images = cases.map(([imageUrl]) => ({ imageUrl, imageTitle: 'fixture' }));
    fetchImage = async url => ({
        data: Buffer.from(url),
        headers: { 'content-type': cases.find(([source]) => source === url)[1] },
    });
    const response = await invoke(exportCollection);
    assert.equal(response.headers['X-Export-Downloaded'], cases.length);
    const zip = await JSZip.loadAsync(response.body);
    for (let index = 0; index < cases.length; index++) {
        const [url, , extension] = cases[index];
        assert.equal(await zip.file((index + 1) + '_fixture.' + extension).async('string'), url);
    }
});
