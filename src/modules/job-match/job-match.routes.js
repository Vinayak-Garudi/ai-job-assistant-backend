const express = require('express');
const jobMatchController = require('./job-match.controller');
const jobMatchValidation = require('./job-match.validation');
const auth = require('../../middleware/auth');
const { aiEndpointLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Analyze job match from URL (with rate limiting)
router.post(
  '/analyze-url',
  aiEndpointLimiter,
  jobMatchValidation.validateAnalyzeUrl,
  jobMatchController.analyzeFromUrl
);

// Analyze job match from manual entry (with rate limiting)
router.post(
  '/analyze-manual',
  aiEndpointLimiter,
  jobMatchValidation.validateAnalyzeManual,
  jobMatchController.analyzeFromManual
);

// Get user's job match history
router.get('/history', jobMatchController.getUserHistory);

// Search user's job match history by company, jobTitle, or location
router.get(
  '/search',
  jobMatchValidation.validateSearch,
  jobMatchController.searchHistory
);

// Get user's high-match jobs
router.get('/high-matches', jobMatchController.getHighMatches);

// Get user's statistics
router.get('/stats', jobMatchController.getStats);

// Monitoring endpoints
router.get('/monitor/health', jobMatchController.getAPIHealth);
router.get('/monitor/errors', jobMatchController.getRecentErrors);

// Get all job matches that have job-specific details
router.get(
  '/job-specific-details-list',
  jobMatchController.getJobSpecificDetailsList
);

// Generate or regenerate job-specific details (DM, email, interview questions, tips)
router.get(
  '/get-job-specific-details/:_id',
  aiEndpointLimiter,
  jobMatchController.getJobSpecificDetails
);

// Get specific job match by ID
router.get('/:id', jobMatchController.getById);

// Re-analyze a job match (with rate limiting)
router.post('/:id/reanalyze', aiEndpointLimiter, jobMatchController.reanalyze);

// Delete a job match
router.delete('/:id', jobMatchController.delete);

module.exports = router;
