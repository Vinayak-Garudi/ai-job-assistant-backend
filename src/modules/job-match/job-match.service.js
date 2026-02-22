const JobMatch = require('./job-match.model');
const User = require('../auth/user.model');
const aiService = require('./ai.service');
const AppError = require('../../utils/AppError');

class JobMatchService {
  /**
   * Analyze job match from URL
   * @param {string} userId - User ID
   * @param {string} jobUrl - Job posting URL
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeFromUrl(userId, jobUrl) {
    try {
      // Get user profile
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Scrape job details from URL
      // const jobDetails = await scraperService.scrapeJobPosting(jobUrl);
      const jobDetails = {
        jobUrl,
      };

      // Add URL to job details
      jobDetails.jobUrl = jobUrl;

      // Perform AI analysis
      const analysis = await aiService.analyzeJobMatch(user, jobDetails);

      // Save to database
      // const jobMatch = await JobMatch.create({
      //   userId,
      //   ...jobDetails,
      //   analysis: {
      //     ...analysis,
      //     analyzedAt: new Date(),
      //   },
      //   status: 'analyzed',
      // });

      const jobMatch = {
        userId,
        ...jobDetails,
        analysis: {
          ...analysis,
          analyzedAt: new Date(),
        },
        status: 'analyzed',
      };

      return jobMatch;
    } catch (error) {
      // Log the actual error for debugging
      console.error('Job match analysis error:', error.message);

      // Check if it's an OpenAI authentication error (401)
      if (
        error.message.includes('authentication failed') ||
        error.message.includes('401')
      ) {
        throw new AppError(
          'OpenAI API authentication failed. Please check your API key configuration.',
          500
        );
      }

      // Check if it's an OpenAI quota/rate limit error (429)
      if (
        error.message.includes('quota') ||
        error.message.includes('429') ||
        error.message.includes('rate limit')
      ) {
        throw new AppError(
          'AI service is temporarily unavailable due to quota limits. Please check your OpenAI billing settings or try again later.',
          429
        );
      }

      // Save error state if job details were obtained
      if (error.jobDetails) {
        await JobMatch.create({
          userId,
          ...error.jobDetails,
          status: 'error',
          error: error.message,
        });
      }

      throw error;
    }
  }

  /**
   * Analyze job match from manual entry
   * @param {string} userId - User ID
   * @param {Object} jobDetails - Manually entered job details
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeFromManualEntry(userId, jobDetails) {
    try {
      // Get user profile
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Validate required fields
      if (!jobDetails.jobTitle || !jobDetails.jobDescription) {
        throw new AppError('Job title and description are required', 400);
      }

      // Perform AI analysis
      const analysis = await aiService.analyzeJobMatch(user, jobDetails);

      // Save to database
      const jobMatch = await JobMatch.create({
        userId,
        ...jobDetails,
        analysis: {
          ...analysis,
          analyzedAt: new Date(),
        },
        status: 'analyzed',
      });

      return jobMatch;
    } catch (error) {
      // Log the actual error for debugging
      console.error('Job match analysis error (manual):', error.message);

      // Check if it's an OpenAI authentication error (401)
      if (
        error.message.includes('authentication failed') ||
        error.message.includes('401')
      ) {
        throw new AppError(
          'OpenAI API authentication failed. Please check your API key configuration.',
          500
        );
      }

      // Check if it's an OpenAI quota/rate limit error (429)
      if (
        error.message.includes('quota') ||
        error.message.includes('429') ||
        error.message.includes('rate limit')
      ) {
        throw new AppError(
          'AI service is temporarily unavailable due to quota limits. Please check your OpenAI billing settings or try again later.',
          429
        );
      }

      // Save error state
      await JobMatch.create({
        userId,
        ...jobDetails,
        status: 'error',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get user's job match history
   * @param {string} userId - User ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} - Job matches with pagination
   */
  async getUserJobMatches(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      status = 'analyzed',
    } = options;

    const skip = (page - 1) * limit;

    const filter = { userId };
    if (status) {
      filter.status = status;
    }

    const [items, total] = await Promise.all([
      JobMatch.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      JobMatch.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get job match by ID
   * @param {string} id - Job match ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} - Job match details
   */
  async getById(id, userId) {
    const jobMatch = await JobMatch.findById(id);

    if (!jobMatch) {
      throw new AppError('Job match not found', 404);
    }

    // Verify ownership
    if (jobMatch.userId.toString() !== userId.toString()) {
      throw new AppError('Unauthorized access to this job match', 403);
    }

    return jobMatch;
  }

  /**
   * Get user's high-match jobs
   * @param {string} userId - User ID
   * @param {number} minPercentage - Minimum matching percentage (default: 70)
   * @returns {Promise<Array>} - High-match jobs
   */
  async getHighMatches(userId, minPercentage = 70) {
    return await JobMatch.findHighMatches(userId, minPercentage);
  }

  /**
   * Delete job match
   * @param {string} id - Job match ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} - Deleted job match
   */
  async delete(id, userId) {
    const jobMatch = await JobMatch.findById(id);

    if (!jobMatch) {
      throw new AppError('Job match not found', 404);
    }

    // Verify ownership
    if (jobMatch.userId.toString() !== userId.toString()) {
      throw new AppError('Unauthorized to delete this job match', 403);
    }

    await JobMatch.findByIdAndDelete(id);
    return jobMatch;
  }

  /**
   * Get user's job match statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Statistics
   */
  async getUserStats(userId) {
    const [total, analyzed, highMatches, avgMatch] = await Promise.all([
      JobMatch.countDocuments({ userId }),
      JobMatch.countDocuments({ userId, status: 'analyzed' }),
      JobMatch.countDocuments({
        userId,
        'analysis.matchingPercentage': { $gte: 70 },
      }),
      JobMatch.aggregate([
        {
          $match: {
            userId: require('mongoose').Types.ObjectId(userId),
            status: 'analyzed',
          },
        },
        {
          $group: {
            _id: null,
            avgPercentage: { $avg: '$analysis.matchingPercentage' },
          },
        },
      ]),
    ]);

    return {
      total,
      analyzed,
      highMatches,
      averageMatchPercentage: avgMatch[0]?.avgPercentage || 0,
      recentAnalyses: await JobMatch.countDocuments({
        userId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    };
  }

  /**
   * Re-analyze an existing job match
   * @param {string} id - Job match ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated job match
   */
  async reanalyze(id, userId) {
    const jobMatch = await JobMatch.findById(id);

    if (!jobMatch) {
      throw new AppError('Job match not found', 404);
    }

    // Verify ownership
    if (jobMatch.userId.toString() !== userId.toString()) {
      throw new AppError('Unauthorized access to this job match', 403);
    }

    // Get user profile
    const user = await User.findById(userId);

    // Perform AI analysis again
    const analysis = await aiService.analyzeJobMatch(user, {
      jobTitle: jobMatch.jobTitle,
      company: jobMatch.company,
      location: jobMatch.location,
      jobDescription: jobMatch.jobDescription,
    });

    // Update job match
    jobMatch.analysis = {
      ...analysis,
      analyzedAt: new Date(),
    };
    jobMatch.status = 'analyzed';
    jobMatch.error = undefined;

    await jobMatch.save();

    return jobMatch;
  }
}

module.exports = new JobMatchService();
