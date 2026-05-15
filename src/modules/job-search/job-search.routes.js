const express = require('express');
const jobSearchController = require('./job-search.controller');
const jobSearchValidation = require('./job-search.validation');
const auth = require('../../middleware/auth');
const { aiEndpointLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

router.use(auth);

// GET /api/job-search/recommended
// Returns jobs ranked for the user with no query required
router.get(
  '/recommended',
  aiEndpointLimiter,
  jobSearchValidation.validateRecommended,
  jobSearchController.recommended
);

// GET /api/job-search/search
// Search with optional explicit params; profile fills in any gaps
router.get(
  '/search',
  aiEndpointLimiter,
  jobSearchValidation.validateSearch,
  jobSearchController.search
);

module.exports = router;
