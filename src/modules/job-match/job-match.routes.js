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

// Get user's high-match jobs
router.get('/high-matches', jobMatchController.getHighMatches);

// Get user's statistics
router.get('/stats', jobMatchController.getStats);

// Monitoring endpoints
router.get('/monitor/health', jobMatchController.getAPIHealth);
router.get('/monitor/errors', jobMatchController.getRecentErrors);

// Get specific job match by ID
router.get('/:id', jobMatchController.getById);

// Re-analyze a job match (with rate limiting)
router.post('/:id/reanalyze', aiEndpointLimiter, jobMatchController.reanalyze);

// Delete a job match
router.delete('/:id', jobMatchController.delete);

module.exports = router;
