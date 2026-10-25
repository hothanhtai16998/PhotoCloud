# Upload pipeline — 2026-10-25

## Current architecture

The API issues an R2 upload URL only after saving an owner-bound `UploadJob`
reservation in MongoDB. Browser storage transfer is not publication.

`POST /api/images/finalize` atomically moves that reservation from staged to
queued, with the accepted metadata. Its 202 response means accepted, never ready.
Repeated finalize requests reuse the reservation and predetermined image ID.
Failed jobs may be explicitly retried by submitting the same upload again.

The in-process runner claims jobs atomically in MongoDB, at most two at a time
per API process. A two-minute lease is renewed every 40 seconds. Another runner
can recover an expired lease. Failed processing is retried up to three attempts
with backoff; exhausted attempts become failed. Workers check their lease before
publishing. Image creation uses the reserved `_id` so a replay after a crash can
reuse the created image instead of creating another.

WebP variants and the image database record form the completion boundary. AVIF
conversion is a separate durable job with the same retry/claim mechanism. It
shares the Sharp operation limit with WebP. Its failure does not remove usable
WebP images. Accepted source files are protected from cancellation and abandoned
pre-upload cleanup while queued, processing or failed. Ordinary abandoned R2
pre-uploads still expire through the existing cleanup process.

`GET /api/images/uploads/:uploadId` requires authentication and ownership and
returns no-store responses. Completed responses contain the persisted image;
an image that has since been deleted returns 410. The browser polls every 1.5
seconds and stops after five minutes with an uncertain/pending message. Retry
keeps the same upload ID. It aborts polling on unmount/logout and rejects results
from an earlier authentication session. No completed screen or refresh event is
emitted merely because R2 upload or finalize returned successfully.

Confirmed uploads also version that owner's profile image requests. The revision
survives F5 in sessionStorage (with an in-memory fallback when storage is blocked),
so opening the profile cannot reuse an older cached list immediately after upload.

User images retain pending moderation; admin uploads retain their approval
behavior. The profile can show the owner's completed images before public approval.

## Operation and rollout

- Restart the backend and reload the frontend together. No Redis is needed.
- Startup waits for the UploadJob model/index initialization before starting the
  runner. MongoDB credentials need the normal application collection/index rights.
- Uploads reserved before this implementation have no owner-bound job record;
  reselect those files. Historical RAM-only jobs cannot be reconstructed from this
  change, because their submitted metadata was never persisted.
- Processing still runs inside the API process and shares its CPU/RAM. This is a
  reliability change, not evidence of improved production throughput. A dedicated
  worker is a later deployment option.
- Main image writes are idempotent. Optional email/AI/notification side effects
  are not a transactional outbox and are not guaranteed exactly once across a
  crash. AI tagging retains its existing queue.
- Failed sources are deliberately retained for retry. Long-term job/source
  retention needs an operational policy before a large deployment.

## Verification

Run from the repository root on Node 24:

```powershell
node --experimental-test-module-mocks --test --test-force-exit backend/tests/upload-api.test.js backend/tests/upload-job-runner.test.js backend/tests/upload-processor.test.js frontend/scripts/test-upload-processing.mjs
```

The API and processor tests mock Mongo/R2. The runner tests use a shared fake
store to exercise restart/lease/retry behavior. They do not substitute for a real
MongoDB process-kill test. Browser fixture `frontend/scripts/test-upload-confirmation.cjs`
requires a frontend build and the local Playwright/Edge runtime; all API/storage
requests are mocked. It checks seven files, delayed processing, failure/retry,
pending moderation, and images appearing in the profile in light/dark desktop.

Before production, verify a large-image upload, backend kill/restart during
processing, Mongo/R2 interruption, and failed retry on an isolated test environment.
Do not test recovery by deleting or modifying real user images.
