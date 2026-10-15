import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewsletterService } from '../src/services/newsletterService.js';
import Subscription from '../src/models/NewsletterSubscription.js';

function fixture() {
    const records = new Map(); const emails = [];
    let time = new Date('2026-10-15T00:00:00Z'); let deliver = true;
    const matches = (record, query) => Object.entries(query).every(([key, value]) => {
        if (key === '$or') return value.some(branch => matches(record, branch));
        if (value && typeof value === 'object' && !(value instanceof Date)) {
            if ('$ne' in value) return record[key] !== value.$ne;
            if ('$exists' in value) return (record[key] !== undefined) === value.$exists;
            if ('$lte' in value) return record[key] !== undefined && record[key] <= value.$lte;
            if ('$gt' in value) return record[key] > value.$gt;
        }
        return record[key] === value;
    });
    const apply = (record, update) => {
        Object.assign(record, update.$set);
        Object.keys(update.$unset ?? {}).forEach(key => delete record[key]);
    };
    const subscriptions = {
        async updateOne(query, update, options) {
            let record = [...records.values()].find(item => matches(item, query));
            if (!record && options?.upsert) { record = { ...update.$setOnInsert }; records.set(record.email, record); }
            if (record) apply(record, update);
        },
        async findOneAndUpdate(query, update) {
            const record = [...records.values()].find(item => matches(item, query));
            if (!record) return null;
            apply(record, update); return { ...record };
        },
    };
    return {
        records, emails,
        service: createNewsletterService({ subscriptions, clientUrl: 'https://photocloud.example', now: () => time,
            sendEmail: async (...args) => { emails.push(args); return deliver; } }),
        advance: ms => { time = new Date(time.getTime() + ms); },
        failMail: () => { deliver = false; },
        token: (action, index = emails.length - 1) => {
            const url = emails[index][3].match(new RegExp(`https://[^\\s]+/newsletter/${action}#[^\\s]+`))[0];
            return new URLSearchParams(new URL(url).hash.slice(1)).get('token');
        },
    };
}

test('normalizes, deduplicates, confirms once, unsubscribes and permits resubscribe', async () => {
    const f = fixture();
    await Promise.all([f.service.subscribe(' Test@Example.com '), f.service.subscribe('test@example.com')]);
    assert.equal(f.emails.length, 1);
    const record = f.records.get('test@example.com');
    assert.equal(record.status, 'pending');
    const confirmation = f.token('confirm'); const unsubscribe = f.token('unsubscribe');
    assert.notEqual(record.confirmationHash, confirmation);
    assert.notEqual(record.unsubscribeHash, unsubscribe);
    await f.service.confirm(confirmation);
    assert.equal(record.status, 'subscribed');
    await assert.rejects(f.service.confirm(confirmation));
    await f.service.subscribe('test@example.com'); assert.equal(f.emails.length, 1);
    await f.service.unsubscribe(unsubscribe); await f.service.unsubscribe(unsubscribe);
    assert.equal(record.status, 'unsubscribed');
    f.advance(60001); await f.service.subscribe('test@example.com');
    await assert.rejects(f.service.unsubscribe(unsubscribe), 'Old unsubscribe link must not cancel a new consent');
    await f.service.confirm(f.token('confirm')); assert.equal(record.status, 'subscribed');
});
test('expired/malformed tokens, cooldown and delivery failure', async () => {
    const f = fixture();
    await assert.rejects(f.service.subscribe('bad'));
    await assert.rejects(f.service.subscribe({ email: 'test@example.com' }));
    await assert.rejects(f.service.confirm({ $ne: null }));
    await f.service.subscribe('test@example.com');
    await f.service.subscribe('test@example.com'); assert.equal(f.emails.length, 1);
    const token = f.token('confirm'); f.advance(86400001);
    await assert.rejects(f.service.confirm(token));
    f.failMail(); await assert.rejects(f.service.subscribe('other@example.com'), { statusCode: 503 });
    assert.equal(f.records.get('other@example.com').confirmationHash, undefined);
    await assert.rejects(f.service.subscribe('other@example.com'), { statusCode: 503 });
    assert.equal(f.emails.length, 3, 'Delivery failure permits immediate retry');
});
test('persistent schema has unique email index and no raw token fields', () => {
    assert.ok(Subscription.schema.indexes().some(([keys, options]) => keys.email === 1 && options.unique));
    assert.equal(Subscription.schema.path('confirmationToken'), undefined);
    assert.equal(Subscription.schema.path('unsubscribeToken'), undefined);
});
