import test from 'node:test';
import assert from 'node:assert/strict';
import { createUploadJobRunner } from '../src/workers/uploadJobRunner.js';

// A shared store models persisted records across runner instances; no real user data.
function store(records) {
    const match = (row, query) => Object.entries(query).every(([key, value]) => {
        if (key === '$or') return value.some(part => match(row, part));
        if (value && typeof value === 'object' && !(value instanceof Date)) {
            return Object.entries(value).every(([op, limit]) => ({
                $lt: () => row[key] < limit, $lte: () => row[key] <= limit,
                $gt: () => row[key] > limit, $gte: () => row[key] >= limit,
            })[op]());
        }
        return row[key] === value;
    });
    const apply = (row, update) => {
        Object.assign(row, update.$set);
        for (const [key, delta] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + delta;
        for (const key of Object.keys(update.$unset || {})) delete row[key];
    };
    return {
        records,
        async exists(query) { return records.some(row => match(row, query)); },
        async updateOne(query, update, options) {
            let row = records.find(row => match(row, query));
            if (!row && options?.upsert) { row = { ...query, ...update.$setOnInsert };records.push(row); }
            if (!row) return { modifiedCount: 0 };
            apply(row, update);
            return { modifiedCount: 1 };
        },
        async updateMany(query, update) { records.filter(row => match(row, query)).forEach(row => apply(row, update)); },
        async findOneAndUpdate(query, update) {
            const row = records.find(row => match(row, query));
            if (!row) return null;
            apply(row, update);
            return structuredClone(row);
        },
    };
}
const job = (id, extra = {}) => ({ _id: id, kind: 'upload', userId: 'user', uploadKey: id + '.jpg', imageId: id,
    status: 'queued', attempts: 0, nextAttemptAt: new Date(0), payload: {}, ...extra });
const logger = { error() {} };
async function until(check) {
    for (let i = 0; i < 100; i++) { if (check()) return;await new Promise(resolve => setTimeout(resolve, 5)); }
    assert.fail('runner did not reach expected state');
}

test('two runners claim each accepted job once, including every later wave', async () => {
    const Job = store(Array.from({ length: 10 }, (_, i) => job(String(i))));
    const calls = [];
    const config = { Job, logger, onFailure: async () => {}, processAvif: async () => ({}),
        processUpload: async data => { calls.push(data.uploadId);await new Promise(resolve => setTimeout(resolve, 5));return { imageId: data.imageId }; } };
    const a = createUploadJobRunner(config), b = createUploadJobRunner(config);
    a.start();b.start();
    try { await until(() => Job.records.every(row => row.status === 'completed'));assert.equal(calls.length, 10);assert.equal(new Set(calls).size, 10); }
    finally { a.stop();b.stop(); }
});

test('restart reclaims expired work, preserves current leases and staged reservations', async () => {
    const Job = store([job('crashed', { status: 'processing', attempts: 1, leaseOwner: 'old', leaseUntil: new Date(0) }),
        job('live', { status: 'processing', leaseUntil: new Date(Date.now() + 60000), leaseOwner: 'other' }), job('not-submitted', { status: 'staged' })]);
    const calls = [];
    const runner = createUploadJobRunner({ Job, logger, onFailure: async () => {}, processAvif: async () => ({}),
        processUpload: async data => { calls.push(data.uploadId);return { imageId: data.imageId }; } });
    runner.start();
    try { await until(() => Job.records[0].status === 'completed');assert.deepEqual(calls, ['crashed']);assert.equal(Job.records[0].attempts, 2); }
    finally { runner.stop(); }
});

test('failure backs off, terminal failures are explicit, and AVIF is a persisted child', async () => {
    const Job = store([job('retry'), job('terminal', { attempts: 2 }), job('ready'),
        job('last-crash', { status: 'processing', attempts: 3, leaseUntil: new Date(0) })]);
    const failures = [];
    const runner = createUploadJobRunner({ Job, logger, onFailure: async row => failures.push(row._id),
        processUpload: async data => { if (data.uploadId !== 'ready') throw Error('R2 down');return { imageId: data.imageId, filename: 'ready', avifPending: true }; },
        processAvif: async () => { throw Error('AVIF down'); } });
    runner.start();
    try {
        await until(() => Job.records.find(row => row._id === 'avif:ready')?.attempts === 1);
        assert.equal(Job.records[0].status, 'queued');assert.ok(Job.records[0].nextAttemptAt > new Date());
        assert.equal(Job.records[1].status, 'failed');assert.deepEqual(failures, ['terminal']);
        assert.equal(Job.records[2].status, 'completed');assert.equal(Job.records[3].status, 'failed');
        assert.equal(Job.records.find(row => row._id === 'avif:ready').status, 'queued');
    } finally { runner.stop(); }
});
