import { createHash, randomBytes } from 'node:crypto';

const digest = token => createHash('sha256').update(token).digest('hex');
const validToken = token => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
const fail = (message, status = 400) => Object.assign(new Error(message), { statusCode: status });

export function createNewsletterService({ subscriptions, sendEmail, clientUrl, now = () => new Date() }) {
    const origin = new URL(clientUrl);
    if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('Invalid newsletter client URL');
    const link = (action, token) => {
        const url = new URL(`/newsletter/${action}`, origin);
        url.hash = new URLSearchParams({ token }).toString();
        return url.href;
    };
    return {
        async subscribe(input) {
            const email = typeof input === 'string' ? input.trim().toLowerCase() : '';
            if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Email không hợp lệ.');
            try {
                await subscriptions.updateOne({ email }, { $setOnInsert: { email, status: 'pending' } }, { upsert: true });
            } catch (error) { if (error.code !== 11000) throw error; }
            const confirmation = randomBytes(32).toString('hex');
            const unsubscribe = randomBytes(32).toString('hex');
            const time = now();
            // Claim a resend atomically so concurrent requests cannot send duplicate emails.
            const record = await subscriptions.findOneAndUpdate({
                email, status: { $ne: 'subscribed' },
                $or: [{ lastRequestedAt: { $lte: new Date(time.getTime() - 60000) } }, { lastRequestedAt: { $exists: false } }],
            }, { $set: {
                status: 'pending', confirmationHash: digest(confirmation),
                confirmationExpiresAt: new Date(time.getTime() + 86400000),
                unsubscribeHash: digest(unsubscribe), lastRequestedAt: time, consentVersion: 'newsletter-v1',
            } }, { new: true });
            if (!record) return;
            const confirmUrl = link('confirm', confirmation);
            const unsubscribeUrl = link('unsubscribe', unsubscribe);
            const text = `Xác nhận nhận tin từ PhotoCloud: ${confirmUrl}\nLiên kết có hiệu lực 24 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.\nHủy nhận tin: ${unsubscribeUrl}`;
            let sent = false;
            try { sent = await sendEmail(email, 'Xác nhận nhận tin PhotoCloud', undefined, text); } catch { /* Report delivery failure below. */ }
            if (!sent) {
                await subscriptions.updateOne({ email, confirmationHash: digest(confirmation) }, { $unset: { lastRequestedAt: 1, confirmationHash: 1, confirmationExpiresAt: 1 } });
                throw fail('Chưa gửi được email xác nhận. Vui lòng thử lại sau.', 503);
            }
        },
        async confirm(token) {
            if (!validToken(token)) throw fail('Liên kết xác nhận không hợp lệ hoặc đã hết hạn.');
            const record = await subscriptions.findOneAndUpdate({ confirmationHash: digest(token), status: 'pending', confirmationExpiresAt: { $gt: now() } }, {
                $set: { status: 'subscribed', confirmedAt: now() },
                $unset: { confirmationHash: 1, confirmationExpiresAt: 1, unsubscribedAt: 1 },
            }, { new: true });
            if (!record) throw fail('Liên kết xác nhận không hợp lệ hoặc đã hết hạn.');
        },
        async unsubscribe(token) {
            if (!validToken(token)) throw fail('Liên kết hủy nhận tin không hợp lệ.');
            const record = await subscriptions.findOneAndUpdate({ unsubscribeHash: digest(token) }, {
                $set: { status: 'unsubscribed', unsubscribedAt: now() },
                $unset: { confirmationHash: 1, confirmationExpiresAt: 1 },
            }, { new: true });
            if (!record) throw fail('Liên kết hủy nhận tin không hợp lệ.');
        },
    };
}
