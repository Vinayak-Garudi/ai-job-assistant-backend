const jobSearchService = require('./job-search.service');
const asyncHandler = require('../../utils/asyncHandler');

class JobSearchController {
  /**
   * Search jobs with explicit parameters (query, location, filters).
   * Any omitted parameter falls back to the user's profile preferences.
   * GET /api/job-search/search
   */
  search = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { query, location, jobTypes, workModes, datePosted, page, limit } =
      req.query;

    // jobTypes / workModes may arrive as a comma-separated string from some clients
    const normalizeArray = (val) => {
      if (!val) return undefined;
      return Array.isArray(val) ? val : val.split(',').map((s) => s.trim());
    };

    const result = await jobSearchService.search(userId, {
      query: query || undefined,
      location: location || undefined,
      jobTypes: normalizeArray(jobTypes),
      workModes: normalizeArray(workModes),
      datePosted,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Job search completed successfully',
      data: result,
    });
  });

  /**
   * Return jobs recommended for the authenticated user based on their profile.
   * No query params required — everything is inferred from the profile.
   * GET /api/job-search/recommended
   */
  recommended = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { datePosted, page, limit } = req.query;

    const result = await jobSearchService.getRecommended(userId, {
      datePosted,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: 'Recommended jobs retrieved successfully',
      data: result,
    });
  });
}

module.exports = new JobSearchController();
