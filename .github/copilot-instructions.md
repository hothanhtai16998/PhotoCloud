## PhotoApp – AI Coding Agent Guide

**Goal**: Enable fast, correct changes without relearning the codebase each time. Keep edits minimal, align with existing patterns, and verify with provided scripts.

**Architecture**
- **Monorepo**: `backend/` (Express + MongoDB, ESM) and `frontend/` (React + Vite + TS). Root scripts orchestrate both.
- **API base**: All routes under `/api` (see `backend/src/server.js`). SPA assets served by backend in production.
- **Storage**: Images/videos stored on Cloudflare R2 via S3-compatible SDK (`backend/src/libs/s3.js`). Multiple sizes via `sharp`. Public URLs use `env.R2_PUBLIC_URL` or `https://pub-${R2_ACCOUNT_ID}.r2.dev`.
- **Security**: CORS allowlist with dynamic origin checks, CSRF double-submit cookie, rate limiting, request deduplication, and per-IP request queuing.

**Run/Build/Test**
- Dev (both): `npm run dev` (root uses `concurrently` to start backend and frontend).
- Backend only: `npm run dev:backend` (root) or `npm run dev` in `backend/`.
- Frontend only: `npm run dev:frontend` (root) or `npm run dev` in `frontend/`.
- Build + start prod: `npm run prod` (root) or `npm run build` (root) then `npm start`.
- Tests (backend): `cd backend; npm test` (Jest with ESM via `NODE_OPTIONS=--experimental-vm-modules`).
- Lint/format (frontend): `npm run lint` (root -> frontend), `npm run format` / `format:check` (root).
- Utilities: free port 3000 with `npm run kill` (root).

**Env & Assumptions**
- Backend validates required env at import (`backend/src/libs/env.js`) and will crash if missing:
  - `MONGODB_URI`, `ACCESS_TOKEN_SECRET`, `CLIENT_URL`
  - R2 required: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
  - Optional: `FRONTEND_URL`, `R2_PUBLIC_URL`, `RESEND_*`, `GOOGLE_*`
- Backend runs with `type: module` and `--no-deprecation`. Trust proxy enabled in production for secure cookies.

**API Layer Patterns (Backend)**
- Mount order in `server.js` matters: `/api` → `requestDeduplication` → `rateLimiter` → `requestQueue` → `csrfToken` → `validateCsrf` → routers.
- CSRF: cookie `XSRF-TOKEN` must match header `X-XSRF-TOKEN` on state-changing methods; public paths are whitelisted in `csrfMiddleware`.
- Routes live in `backend/src/routes/*Route.js`, calling controllers in `backend/src/controllers/**`. Use `asyncHandler` and centralized `errorHandler`.
- When adding media flows, prefer helpers in `backend/src/libs/s3.js` (`uploadImageWithSizes`, `uploadVideo`, `uploadAvatar`).

**API Consumption Patterns (Frontend)**
- Always import the preconfigured Axios client `frontend/src/lib/axios.ts`:
  - `baseURL` is `http://localhost:3000/api` in dev, `/api` in prod.
  - `withCredentials: true` for cookie-based flows (refresh token, CSRF cookie).
  - Interceptors: attach `Authorization: Bearer <accessToken>`, add `X-XSRF-TOKEN` from cookie for POST/PUT/PATCH/DELETE, auto-refresh on 401, refresh CSRF on 403.
- Organize network logic in `frontend/src/services/*.ts`; state in `frontend/src/stores/*` (Zustand). Keep components lean and delegate side-effects to services/stores.

**Conventions**
- Frontend naming: see `frontend/src/NAMING_CONVENTIONS.md` (components `PascalCase.tsx`, hooks `useXxx.ts`, utils/types/config `camelCase.ts`, feature folders lowercase).
- Example service call:
  ```ts
  import api from '@/lib/axios';
  export const fetchImages = (params?: Record<string, string>) => api.get('/images', { params });
  ```
- Example protected write:
  ```ts
  await api.post('/images', formData); // CSRF + auth headers handled by interceptor
  ```

**Integration & Cross-Cutting**
- Social sharing: `/photos/:slug` is handled server-side for crawlers; keep this route above SPA fallback.
- Performance: compression enabled; R2 objects served with long `Cache-Control`. Avoid bypassing helpers that set caching.
- Background chores: session/pre-upload cleanup schedulers start with the server and stop on SIGINT/SIGTERM.

**When Editing**
- Respect middleware order and `/api` prefix; new protected routes inherit CSRF/limits automatically when mounted under `/api`.
- Prefer existing utils over ad-hoc code: `utils/`, `middlewares/`, `services/`, `stores/`.
- Keep diffs small and consistent with current style. If changing headers/CORS, review `server.js` CSP/CORS logic.

Questions or unclear spots? Tell the maintainer which section is ambiguous (e.g., env expectations, route whitelist, storage paths), and propose concrete updates to this file.
