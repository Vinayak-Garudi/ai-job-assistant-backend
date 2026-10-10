const jobSuggestionsService = require('./job-suggestions.service');
const asyncHandler = require('../../utils/asyncHandler');

class JobSuggestionsController {
  /**
   * Get job suggestions for the logged-in user (cached per user)
   * GET /api/job-suggestions
   */
  getSuggestions = asyncHandler(async (req, res) => {
    const result = await jobSuggestionsService.getSuggestions(req.user);

    res.status(200).json({
      success: true,
      message: 'Job suggestions retrieved successfully',
      data: result,
    });
  });

  /**
   * Force a new search, bypassing the cache (subject to a cooldown)
   * POST /api/job-suggestions/refresh
   */
  refreshSuggestions = asyncHandler(async (req, res) => {
    const result = await jobSuggestionsService.getSuggestions(req.user, {
      forceRefresh: true,
    });

    res.status(200).json({
      success: true,
      message: 'Job suggestions refreshed successfully',
      data: result,
    });
  });
}

module.exports = new JobSuggestionsController();
