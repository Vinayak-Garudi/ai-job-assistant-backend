const express = require('express');
const jobMatchController = require('./job-match.controller');
const jobMatchValidation = require('./job-match.validation');
const auth = require('../../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Analyze job match from URL
router.post(
  '/analyze-url',
  jobMatchValidation.validateAnalyzeUrl,
  jobMatchController.analyzeFromUrl
);

// Analyze job match from manual entry
router.post(
  '/analyze-manual',
  jobMatchValidation.validateAnalyzeManual,
  jobMatchController.analyzeFromManual
);

// Get user's job match history
router.get('/history', jobMatchController.getUserHistory);

// Get user's high-match jobs
router.get('/high-matches', jobMatchController.getHighMatches);

// Get user's statistics
router.get('/stats', jobMatchController.getStats);

// Get specific job match by ID
router.get('/:id', jobMatchController.getById);

// Re-analyze a job match
router.post('/:id/reanalyze', jobMatchController.reanalyze);

// Delete a job match
router.delete('/:id', jobMatchController.delete);

module.exports = router;
