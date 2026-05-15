# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start with NODE_ENV=local (uses .env.local)
npm run dev:development  # Start with NODE_ENV=development (uses .env.development)
npm start                # Production (NODE_ENV=production, uses .env.production)
npm test                 # Run Jest tests
npm run lint             # ESLint with auto-fix
npm run format           # Prettier format
npm run generate         # CLI generator for new modules/models/services/controllers
```

Run a single test file:
```bash
npx jest tests/auth.test.js
```

## Environment Configuration

Environment files are loaded by priority based on `NODE_ENV` (`src/config/env.js`):
- `local` → `.env.local`
- `development` → `.env.development`
- `production` → `.env.production`

Required env vars:
| Variable | Notes |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `OPENAI_API_KEY` | OpenAI key |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini` |
| `ENCRYPTION_KEY` | **64-char hex string** (32 bytes) — required for CTC encryption |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME` | S3 file storage |

## Architecture

### Module Auto-Loading

`src/utils/routeLoader.js` auto-discovers every directory under `src/modules/` at startup. For each module it looks for `<module>.routes.js` and optionally `route.config.js`. No manual route registration in `app.js` is needed. To add a new module, create a directory with those two files.

`route.config.js` controls the mount path, whether the module is enabled, per-module middleware, and per-module rate limits:
```js
module.exports = {
  path: '/api/my-module',
  enabled: true,
  middleware: [require('../../middleware/auth')],
  rateLimit: { windowMs: 15 * 60 * 1000, max: 50 },
};
```

### Module Structure

Each module follows the same layered pattern:
```
src/modules/<name>/
  <name>.model.js       # Mongoose schema
  <name>.service.js     # Business logic (exported as singleton)
  <name>.controller.js  # Express handlers — use asyncHandler()
  <name>.routes.js      # Express router
  <name>.validation.js  # Joi middleware
  route.config.js       # Mount path + options
```

### Authentication Flow

Auth is double-validated: JWT signature check **and** a live `Session` document in MongoDB (`src/modules/auth/session.model.js`). The `auth` middleware (`src/middleware/auth.js`) attaches `req.user`, `req.session`, and `req.token`. Logout works by deactivating the session record, not just discarding the token client-side.

### Sensitive Field Encryption

`professionalInfo.currentCTCPerAnum` is stored as AES-256-GCM ciphertext (`<iv_hex>:<authTag_hex>:<ciphertext_hex>`) using `src/utils/encryption.js`. Key things to know:

- The Mongoose `pre('save')` hook encrypts the field automatically on `save()`.
- **`findByIdAndUpdate` bypasses pre-save hooks** — always call `encrypt()` manually before passing the value to that method (see `auth.service.js → updateProfile`).
- `user.toJSON()` automatically decrypts the field for API responses.
- Use `isEncrypted(value)` to check before encrypting to avoid double-encryption.

### Background AI Generation (Fire-and-Forget)

Several profile-enrichment tasks run asynchronously after register/profile-update and are never awaited by the HTTP response:

- **Ideal LinkedIn profile** — generated on register and every profile update
- **Salary estimate** — generated on every profile update
- **ATS-optimised ideal resume** — generated on every profile update

These are implemented as `_generateXInBackground(userId)` private methods in `auth.service.js` using self-invoking async IIFEs. Failures are caught and only logged — they never surface to the client.

### Job Match Pipeline

`POST /api/job-match/analyze-url`:
1. Scrape job URL — tries Cheerio first (fast, static HTML), falls back to Puppeteer for JS-rendered pages (`scraper.service.js`).
2. Validate URL against an allowlist of known job boards **and** path-based heuristics (`ai.service.js → isValidJobURL`).
3. Call OpenAI with a structured text prompt that parses `MATCHING_PERCENTAGE`, `STRENGTHS`, `AREAS_TO_IMPROVE`, `RESUME_FEEDBACK`, and `DETAILED_ANALYSIS` sections from the response.
4. **Upsert** by `{ userId, jobUrl }` — re-analyzing the same URL updates the existing document rather than creating a duplicate.

`POST /api/job-match/analyze-manual` skips scraping and takes `jobTitle`/`jobDescription` directly.

All OpenAI calls go through `retryWithBackoff` (exponential backoff with jitter) which retries on 429 / rate-limit errors.

### File Upload

The `upload` module stores files in AWS S3 via `multer-s3`. S3 keys and public URLs are saved in the `Upload` collection; presigned URLs (1-hour TTL) are generated on retrieval. Resume URLs stored on the `User` document are used by the AI services to fetch and parse PDF text (capped at 6 000 chars) before building prompts.

### Error Handling

- `AppError` (`src/utils/AppError.js`) — operational errors with HTTP status code; caught by the global error handler in `src/middleware/errorHandler.js`.
- `asyncHandler` (`src/utils/asyncHandler.js`) — wraps controller functions to forward thrown errors to Express's `next`.
- `apiMonitor` (`src/utils/apiMonitor.js`) — in-memory counter for OpenAI call successes, failures, and retries; exposed via `/api/job-match/monitor/health`.
