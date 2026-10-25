import { randomUUID } from 'node:crypto';

const MAX_ATTEMPTS = 3;
const LEASE_MS = 120_000;

/** Mongo claims are atomic; a lease lets another API instance recover crashed work. */
export function createUploadJobRunner({ Job, processUpload, processAvif, onFailure, logger, concurrency = 2 }) {
    const owner = randomUUID();
    let timer = null;
    let running = false;
    let active = 0;
    let claiming = false;

    async function execute(job) {
        const identity = { _id: job._id, status: 'processing', leaseOwner: owner };
        const assertLease = async () => {
            if (!await Job.exists({ ...identity, leaseUntil: { $gt: new Date() } })) {
                throw new Error('Upload processing lease expired');
            }
        };
        const heartbeat = setInterval(() => {
            Job.updateOne(identity, { $set: { leaseUntil: new Date(Date.now() + LEASE_MS) } })
                .catch(error => logger.error('Upload heartbeat failed', error.message));
        }, LEASE_MS / 3);
        heartbeat.unref?.();
        try {
            const result = job.kind === 'avif'
                ? await processAvif(job, assertLease)
                : await processUpload({ ...job.payload, uploadId: job._id, uploadKey: job.uploadKey,
                    userId: String(job.userId), imageId: job.imageId }, assertLease);
            await assertLease();
            if (job.kind === 'upload' && result.avifPending) {
                await Job.updateOne({ _id: `avif:${job._id}` }, { $setOnInsert: {
                    kind: 'avif', userId: job.userId, uploadKey: job.uploadKey, imageId: result.imageId,
                    payload: { filename: result.filename }, status: 'queued', attempts: 0, nextAttemptAt: new Date(),
                } }, { upsert: true });
            }
            await Job.updateOne(identity, { $set: { status: 'completed', completedAt: new Date(), lastError: null },
                $unset: { leaseUntil: 1, leaseOwner: 1 } });
        } catch (error) {
            const terminal = job.attempts >= MAX_ATTEMPTS;
            const updated = await Job.updateOne(identity, {
                $set: { status: terminal ? 'failed' : 'queued', lastError: 'Không xử lý được ảnh. Vui lòng thử lại.',
                    nextAttemptAt: new Date(Date.now() + 5000 * 2 ** (job.attempts - 1)) },
                $unset: { leaseUntil: 1, leaseOwner: 1 },
            });
            logger.error('Upload processing failed', { uploadId: job._id, error: error.message });
            if (terminal && updated.modifiedCount && job.kind === 'upload') await onFailure(job);
        } finally {
            clearInterval(heartbeat);
        }
    }

    async function drain() {
        if (!running || claiming) return;
        claiming = true;
        try {
            await Job.updateMany({ status: 'processing', attempts: { $gte: MAX_ATTEMPTS }, leaseUntil: { $lte: new Date() } },
                { $set: { status: 'failed', lastError: 'Xử lý ảnh bị gián đoạn. Vui lòng thử lại.' }, $unset: { leaseOwner: 1, leaseUntil: 1 } });
            while (running && active < concurrency) {
                const now = new Date();
                const job = await Job.findOneAndUpdate({ attempts: { $lt: MAX_ATTEMPTS }, $or: [
                    { status: 'queued', nextAttemptAt: { $lte: now } },
                    { status: 'processing', leaseUntil: { $lte: now } },
                ] }, { $set: { status: 'processing', leaseOwner: owner, leaseUntil: new Date(Date.now() + LEASE_MS) },
                    $inc: { attempts: 1 } }, { new: true, sort: { kind: -1, createdAt: 1 } });
                if (!job) break;
                active++;
                void execute(job).catch(error => logger.error('Upload runner failed', error.message)).finally(() => {
                    active--;
                    void drain();
                });
            }
        } catch (error) {
            logger.error('Cannot claim upload jobs', error.message);
        } finally {
            claiming = false;
        }
    }

    return {
        start() {
            if (running) return;
            running = true;
            timer = setInterval(() => { void drain(); }, 5000);
            timer.unref?.();
            void drain();
        },
        wake: drain,
        stop() { running = false; clearInterval(timer); timer = null; },
    };
}
