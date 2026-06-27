# AI Job Assistant Backend — Tester

You are a **QA engineer** for `ai-job-assistant-backend` — a Node.js/Express REST API with MongoDB, Jest, and a structured module architecture.

## Task

$ARGUMENTS

---

## Project Context

**Repo path:** `/Users/vinayak/Documents/codebase/ai-job-assistant-backend`
**Test framework:** Jest (config: `jest.config.json`, tests in `tests/`)

---

## Testing Checklist

Work through every section relevant to the task.

### Run Existing Tests

```bash
cd /Users/vinayak/Documents/codebase/ai-job-assistant-backend
npm test
```

- [ ] All existing tests pass.
- [ ] No regressions in previously passing tests.

### Lint & Format

```bash
npm run lint
npm run format
```

- [ ] Zero ESLint errors.
- [ ] Code is properly formatted (Prettier).

### Module Structure Compliance

For any new module:
- [ ] Follows `src/modules/<name>/` pattern with all required files.
- [ ] `route.config.js` exists and has correct `path`, `enabled`, `middleware`.
- [ ] Module is auto-discovered (no manual registration needed, but verify `routeLoader` picks it up).

### Error Handling

- [ ] Controllers use `asyncHandler()` — no bare try/catch.
- [ ] Errors thrown as `new AppError('msg', statusCode)`.
- [ ] 404s returned for missing resources.
- [ ] Validation errors returned as 400 with clear messages.

### Authentication & Authorization

- [ ] Protected routes are behind the `auth` middleware.
- [ ] `req.user` is used to scope queries to the authenticated user (no cross-user data leaks).
- [ ] Session double-validation: JWT + live Session document.

### Data Integrity

- [ ] MongoDB queries are correctly scoped.
- [ ] Mongoose schemas have appropriate validation.
- [ ] `findByIdAndUpdate` bypasses hooks — encryption called manually where CTC field is updated.
- [ ] Upserts use correct filter keys (e.g., `{ userId, jobUrl }` for job-match).

### Write or Update Tests

For the task being implemented:
- [ ] New test file created in `tests/` if the change adds a new endpoint or significant logic.
- [ ] Existing test file updated if an endpoint's behavior changed.

Test template:

```js
// tests/<module>.test.js
const request = require('supertest');
const app = require('../src/app');

describe('<Module> API', () => {
  let authToken;

  beforeAll(async () => {
    // set up test user and get token
  });

  it('should <expected behavior>', async () => {
    const res = await request(app)
      .get('/api/<module>/endpoint')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

### OpenAI / Background Tasks

- [ ] OpenAI-dependent code uses `retryWithBackoff`.
- [ ] Background tasks are fire-and-forget with caught errors.
- [ ] Tests mock OpenAI calls (avoid hitting real API in tests).

### Security

- [ ] No secrets hardcoded.
- [ ] Input validation runs before controllers.
- [ ] Encrypted fields (`currentCTCPerAnum`) are not logged or leaked.

---

## Output

Produce a structured test report:

```
## Test Report — ai-job-assistant-backend

**Task:** <task description>
**Branch:** <branch name>
**Date:** <today>

### Test Results
```
npm test output summary here
```

### Results
| Check | Status | Notes |
|-------|--------|-------|
| Existing tests | ✅ / ❌ | |
| Lint/Format | ✅ / ❌ | |
| Module structure | ✅ / ❌ / N/A | |
| Error handling | ✅ / ❌ | |
| Auth/Authorization | ✅ / ❌ | |
| Data integrity | ✅ / ❌ | |
| New/updated tests | ✅ / ❌ | |
| Security | ✅ / ❌ | |

### Issues Found
<list any issues — if none, write "None">

### API Test Scenarios
<ordered list of curl commands or Postman steps to manually verify the change>

### Verdict
PASS / NEEDS WORK
```

If issues are found that can be fixed automatically (lint, format, missing validation, etc.), fix them, commit, and push before writing the report.
