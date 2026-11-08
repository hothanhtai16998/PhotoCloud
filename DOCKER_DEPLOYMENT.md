# PhotoCloud container deployment

## Build context and runtime

Run from the repository root, not from `backend/`:

```powershell
docker build --progress=plain -f backend/Dockerfile -t photocloud:local .
docker image inspect photocloud:local --format '{{.Size}}'
```

The image uses Node 22 Alpine, matching CI's Node major version. Separate stages
install backend production dependencies and build the existing frontend. The
runtime contains `/app/backend/src`, production `node_modules`, frontend `dist`
and `shared/sitePalette.json`; it runs as the built-in `node` user. Frontend source
is built as-is; no frontend behavior is changed by this packaging change.

`backend/Dockerfile.dockerignore` is the Dockerfile-specific allowlist for the
repository-root context. It excludes `.env*`, `.npmrc`, local dependencies, Git
history and test output before upload to a builder. `backend/.dockerignore` is
defense in depth for backend-only tooling. Both lockfiles must be committed with
their manifests; installation uses `npm ci`, including Linux optional native
packages. No private npm registry is configured in this build.

Provide secrets at runtime, never through Docker `COPY`, build arguments or
committed environment files. The server requires MongoDB and R2 settings; use
Fly secrets for production. Do not run verification against production data.

## Verification

On PowerShell, verify the final image without application credentials:

```powershell
Get-Content -Raw backend/scripts/verify-container.mjs |
  docker run --rm -i --entrypoint node photocloud:local --input-type=module
```

The check asserts a non-root UID, frontend/palette presence, absence of secrets
and development tools, and actual `sharp` and `bcrypt` operations. The Docker
workflow also starts the server with disposable MongoDB and dummy R2 settings,
then checks health, the homepage and its generated JavaScript asset. Dummy R2
settings do not verify real storage, uploads, authentication or production data.
The workflow builds locally on the runner; it does not push an image or deploy.

For Fly deployment, after review and explicit release authorization:

```powershell
flyctl deploy . --config backend/fly.toml
```

Always use the repository root as context. The Fly configuration points to
`backend/Dockerfile`. Fly commands that access an app require authentication;
installing the CLI does not authenticate or establish production state.

The existing optional GIF/video conversion still needs an available `ffmpeg`
binary; this change does not add it or claim to enable that optional feature.

## Verification status — 2026-11-08

- Installed Docker Desktop 4.98.0 (CLI 29.9.2), WSL 3.0.3.0 and Fly CLI 0.5.5.
  Docker installer signature was valid (Docker Inc); Fly ZIP SHA-256 matched the
  official GitHub release asset digest.
- Backend tests: 28/28 passed on Windows with Node 24.20.0. Backend structure
  verification passed. Both local lockfiles match their package manifests and
  include Linux/musl native dependency entries. Isolated offline `npm ci
  --dry-run --ignore-scripts` checks passed for both lockfiles (backend omits
  dev dependencies). These do not prove installation inside Linux.
- Existing frontend Vite production build passed on Windows; output was written
  to the ignored diagnostic folder without editing frontend source. Warnings
  remain for dependency annotations and a bundle exceeding 500 kB. This is a
  build check, not a typecheck or a browser acceptance test. Workflow YAML and
  Fly TOML parse successfully.
- After the user restarted Windows, Docker's Linux engine started successfully.
  The complete image built from repository root using the locked Linux packages.
  `docker image inspect` reported 356,563,526 bytes (about 340.0 MiB) for
  `photocloud:review`. This is Docker's reported local image size, not registry
  transfer size. An unchanged second build took 2.43 seconds measured with a
  PowerShell stopwatch; build steps were cached. This does not measure deployment
  or a clean build and is not a before/after comparison.
- Final-image verification passed: non-root user `node`, expected runtime paths,
  no `.env*` or development tools in application directories, successful sharp
  image conversion and bcrypt hash/compare on Linux.
- Started a separate MongoDB 7 container and PhotoCloud with dummy R2 credentials
  and no published host ports. Passed health HTTP 200, homepage HTML, generated
  JavaScript HTTP 200 and MIME type, and direct SPA route `/collections`.
  Docker reported `healthy` with zero healthcheck failures. This verifies HTTP
  serving, not interactive browser behavior or user acceptance.
- Real R2 operations remain unverified. The existing health endpoint reported
  storage `connected` even with dummy credentials, while background pre-upload
  cleanup logged a TLS error against the dummy R2 endpoint. Therefore the health
  response is not evidence of working R2 connectivity. No real R2 credentials or
  production database were supplied. Test containers/network were removed after
  verification; the built image and build cache remain available locally.
- The GitHub Docker workflow has not run remotely. Fly config validation was
  blocked by lack of a login token. No production deployment was performed.

Local diagnostic logs are in `.local-backups/docker-review-20261108/` (ignored).
Do not compare a complete frontend+backend image with the old backend-only image
as if they contained the same application. No size or deployment-speed claim is
made until a reproducible measurement is available.
