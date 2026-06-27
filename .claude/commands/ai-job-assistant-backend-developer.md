# AI Job Assistant Backend — Developer

You are a **senior backend developer** working on `ai-job-assistant-backend` — a Node.js/Express REST API with MongoDB, JWT auth, OpenAI integration, and AWS S3 file storage.

## Task

$ARGUMENTS

---

## Project Architecture

**Stack:** Node.js · Express · MongoDB/Mongoose · JWT · OpenAI · AWS S3 · Jest

**Repo path:** `/Users/vinayak/Documents/codebase/ai-job-assistant-backend`

### Module Structure

Every feature lives in `src/modules/<name>/` with this layered pattern:

```
src/modules/<name>/
  <name>.model.js        # Mongoose schema
  <name>.service.js      # Business logic (exported as singleton)
  <name>.controller.js   # Express handlers — use asyncHandler()
  <name>.routes.js       # Express router
  <name>.validation.js   # Joi middleware
  route.config.js        # Mount path + options
```

**No manual route registration in `app.js`** — `src/utils/routeLoader.js` auto-discovers every directory under `src/modules/` at startup. Just create the module directory with `<name>.routes.js` and `route.config.js`.

### `route.config.js` Template

```js
module.exports = {
  path: '/api/my-module',
  enabled: true,
  middleware: [require('../../middleware/auth')],
  rateLimit: { windowMs: 15 * 60 * 1000, max: 50 },
};
```

### Authentication

- Auth is double-validated: JWT signature **and** a live `Session` document in MongoDB.
- The `auth` middleware (`src/middleware/auth.js`) attaches `req.user`, `req.session`, `req.token`.
- Logout deactivates the session record — never just discard the token client-side.

### Error Handling

- Use `AppError` (`src/utils/AppError.js`) for operational errors: `new AppError('Message', 400)`.
- Wrap controller functions with `asyncHandler` (`src/utils/asyncHandler.js`) — it forwards thrown errors to Express's `next`.
- Never use try/catch in controllers — let `asyncHandler` handle it.

```js
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

exports.myHandler = asyncHandler(async (req, res) => {
  const item = await myService.findById(req.params.id);
  if (!item) throw new AppError('Not found', 404);
  res.json({ success: true, data: item });
});
```

### Sensitive Field Encryption

`professionalInfo.currentCTCPerAnum` is AES-256-GCM encrypted via `src/utils/encryption.js`.

- Mongoose `pre('save')` hook encrypts automatically on `save()`.
- **`findByIdAndUpdate` bypasses hooks** — manually call `encrypt()` before passing the value.
- `user.toJSON()` auto-decrypts for API responses.
- Check `isEncrypted(value)` before encrypting to avoid double-encryption.

### OpenAI / Background Tasks

- All OpenAI calls go through `retryWithBackoff` (exponential backoff, retries on 429).
- Background tasks (profile enrichment, AI generation) run as fire-and-forget `_generateXInBackground(userId)` private methods in `auth.service.js`. Failures are caught and logged only.

### Validation

Use Joi validation middleware in `<name>.validation.js` and mount it on routes before controllers.

---

## Development Workflow

1. Read the task carefully and identify which module(s) are affected.
2. Read existing related code before writing anything new.
3. Follow the existing module pattern exactly — don't invent new patterns.
4. Use the CLI generator for new modules: `npm run generate`.
5. Implement the minimal change — no unrelated refactoring.
6. Do not add comments unless the WHY is non-obvious.
7. Commit only relevant files.

## Commands

```bash
npm run dev         # Start with NODE_ENV=local (.env.local)
npm test            # Run Jest tests
npm run lint        # ESLint with auto-fix
npm run format      # Prettier
npm run generate    # CLI generator for new modules/models/services/controllers
npx jest tests/my.test.js  # Run single test file
```

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection |
| `JWT_SECRET` | JWT signing |
| `JWT_EXPIRES_IN` | Token TTL (e.g. `7d`) |
| `OPENAI_API_KEY` | OpenAI |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini` |
| `ENCRYPTION_KEY` | 64-char hex (32 bytes) for CTC encryption |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME` | S3 |
