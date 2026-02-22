const jobMatchService = require('./job-match.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

class JobMatchController {
  /**
   * Analyze job match from URL
   * POST /api/job-match/analyze-url
   */
  analyzeFromUrl = asyncHandler(async (req, res) => {
    const { jobUrl } = req.body;
    const userId = req.user.id;

    if (!jobUrl) {
      throw new AppError('Job URL is required', 400);
    }

    const result = await jobMatchService.analyzeFromUrl(userId, jobUrl);

    res.status(201).json({
      success: true,
      message: 'Job match analyzed successfully from URL',
      data: result,
    });
  });

  /**
   * Analyze job match from manual entry
   * POST /api/job-match/analyze-manual
   */
  analyzeFromManual = asyncHandler(async (req, res) => {
    const { jobTitle, company, location, jobDescription } = req.body;
    const userId = req.user.id;

    if (!jobTitle || !jobDescription) {
      throw new AppError('Job title and description are required', 400);
    }

    const jobDetails = {
      jobTitle,
      company: company || 'Not specified',
      location: location || 'Not specified',
      jobDescription,
    };

    const result = await jobMatchService.analyzeFromManualEntry(
      userId,
      jobDetails
    );

    res.status(201).json({
      success: true,
      message: 'Job match analyzed successfully from manual entry',
      data: result,
    });
  });

  /**
   * Get user's job match history
   * GET /api/job-match/history
   */
  getUserHistory = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      status: req.query.status,
    };

    const result = await jobMatchService.getUserJobMatches(userId, options);

    res.status(200).json({
      success: true,
      message: 'Job match history retrieved successfully',
      data: result.items,
      pagination: result.pagination,
    });
  });

  /**
   * Get job match by ID
   * GET /api/job-match/:id
   */
  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const jobMatch = await jobMatchService.getById(id, userId);

    res.status(200).json({
      success: true,
      message: 'Job match retrieved successfully',
      data: jobMatch,
    });
  });

  /**
   * Get user's high-match jobs
   * GET /api/job-match/high-matches
   */
  getHighMatches = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const minPercentage = parseInt(req.query.minPercentage) || 70;

    const highMatches = await jobMatchService.getHighMatches(
      userId,
      minPercentage
    );

    res.status(200).json({
      success: true,
      message: 'High-match jobs retrieved successfully',
      data: highMatches,
      count: highMatches.length,
    });
  });

  /**
   * Delete job match
   * DELETE /api/job-match/:id
   */
  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    await jobMatchService.delete(id, userId);

    res.status(200).json({
      success: true,
      message: 'Job match deleted successfully',
    });
  });

  /**
   * Get user's job match statistics
   * GET /api/job-match/stats
   */
  getStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const stats = await jobMatchService.getUserStats(userId);

    res.status(200).json({
      success: true,
      message: 'Job match statistics retrieved successfully',
      data: stats,
    });
  });

  /**
   * Re-analyze an existing job match
   * POST /api/job-match/:id/reanalyze
   */
  reanalyze = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await jobMatchService.reanalyze(id, userId);

    res.status(200).json({
      success: true,
      message: 'Job match re-analyzed successfully',
      data: result,
    });
  });
}

module.exports = new JobMatchController();
