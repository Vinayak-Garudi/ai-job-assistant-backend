const express = require('express');
const rateLimit = require('express-rate-limit');
const jobSuggestionsController = require('./job-suggestions.controller');
const jobSuggestionsValidation = require('./job-suggestions.validation');
const auth = require('../../middleware/auth');

const router = express.Router();

router.use(auth);

// Keyed by user, not IP: requests arrive via the Next.js server, so every
// user shares one IP and an IP limiter would throttle them collectively.
const perUserLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => req.user.id,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ success: false, message });
    },
  });

router.get(
  '/',
  perUserLimiter(
    15 * 60 * 1000,
    30,
    'Too many job suggestion requests. Please try again in a few minutes.'
  ),
  jobSuggestionsValidation.validateGetSuggestions,
  jobSuggestionsController.getSuggestions
);

router.post(
  '/refresh',
  perUserLimiter(
    60 * 60 * 1000,
    6,
    'Hourly refresh limit reached. Please try again later.'
  ),
  jobSuggestionsValidation.validateRefresh,
  jobSuggestionsController.refreshSuggestions
);

module.exports = router;
