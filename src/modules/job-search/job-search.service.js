const User = require('../auth/user.model');
const jobSearchApiService = require('./job-search-api.service');
const AppError = require('../../utils/AppError');

// How many top-N skills/roles to include in an auto-built query
const MAX_QUERY_SKILLS = 3;
const MAX_QUERY_ROLES = 2;

class JobSearchService {
  /**
   * Search jobs using explicit parameters. Profile data is used to
   * auto-fill missing parameters when the caller omits them.
   *
   * @param {string} userId
   * @param {Object} params
   * @param {string} [params.query]           - keyword / job title override
   * @param {string} [params.location]        - location override
   * @param {string[]} [params.jobTypes]      - employment type filter override
   * @param {string[]} [params.workModes]     - work mode filter override
   * @param {string} [params.datePosted]      - 'all'|'today'|'3days'|'week'|'month'
   * @param {number} [params.page]
   * @param {number} [params.limit]
   * @returns {Promise<Object>}
   */
  async search(userId, params = {}) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const {
      query,
      location,
      jobTypes,
      workModes,
      datePosted = 'month',
      page = 1,
      limit = 10,
    } = params;

    const resolvedQuery = query || this._buildQueryFromProfile(user);
    const resolvedLocation = location || this._pickLocation(user);
    const resolvedJobTypes = jobTypes || user.jobPreferences?.jobTypes || [];
    const resolvedWorkModes = workModes || user.jobPreferences?.workModes || [];

    if (!resolvedQuery) {
      throw new AppError(
        'Could not build a search query. Please complete your profile (desired roles or skills) or provide an explicit query.',
        400
      );
    }

    const jobs = await jobSearchApiService.searchJobs({
      query: resolvedQuery,
      location: resolvedLocation,
      employmentTypes: resolvedJobTypes,
      remoteOnly:
        resolvedWorkModes.length > 0 &&
        resolvedWorkModes.every((m) => m === 'Remote'),
      datePosted,
      page,
      perPage: limit,
    });

    const scoredJobs = this._scoreAndSort(jobs, user, resolvedWorkModes);

    return {
      query: resolvedQuery,
      location: resolvedLocation || null,
      jobs: scoredJobs,
      pagination: { page: Number(page), limit: Number(limit), count: scoredJobs.length },
    };
  }

  /**
   * Return jobs recommended for the user based purely on their profile —
   * no explicit params needed.
   */
  async getRecommended(userId, { datePosted = 'week', page = 1, limit = 10 } = {}) {
    return this.search(userId, { datePosted, page, limit });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Build a search query string from the user's profile.
   * Priority: desiredRoles > currentTitle + top skills
   */
  _buildQueryFromProfile(user) {
    const roles = user.jobPreferences?.desiredRoles?.slice(0, MAX_QUERY_ROLES) || [];
    const skills = (user.otherInfo?.skills || []).slice(0, MAX_QUERY_SKILLS);
    const currentTitle = user.professionalInfo?.currentTitle;

    if (roles.length > 0) {
      // Use first role as the anchor; Google Jobs responds better to natural-language queries
      return skills.length > 0
        ? `${roles[0]} ${skills.slice(0, 2).join(' ')}`
        : roles[0];
    }

    if (currentTitle) {
      return skills.length > 0
        ? `${currentTitle} ${skills.slice(0, 2).join(' ')}`
        : currentTitle;
    }

    if (skills.length > 0) {
      return skills.join(' ');
    }

    return null;
  }

  /**
   * Pick the best location from the user's preferences.
   */
  _pickLocation(user) {
    const preferred = user.jobPreferences?.preferredLocations || [];
    if (preferred.length > 0) return preferred[0];
    return user.basicInfo?.location || null;
  }

  /**
   * Score each job based on profile relevance and sort descending.
   *
   * Scoring breakdown (0–100):
   *  - Title match with desired roles / current title  → up to 35 pts
   *  - Skill keyword hits in description + qualifications → up to 40 pts
   *  - Work mode match (remote/on-site)               → up to 15 pts
   *  - Location match                                  → up to 10 pts
   */
  _scoreAndSort(jobs, user, resolvedWorkModes) {
    const desiredRoles = (user.jobPreferences?.desiredRoles || []).map((r) =>
      r.toLowerCase()
    );
    const currentTitle = (user.professionalInfo?.currentTitle || '').toLowerCase();
    const skills = (user.otherInfo?.skills || []).map((s) => s.toLowerCase());
    const preferredLocations = (
      user.jobPreferences?.preferredLocations || []
    ).map((l) => l.toLowerCase());

    const workModeSet = new Set((resolvedWorkModes || []).map((m) => m.toLowerCase()));

    return jobs
      .map((job) => {
        let score = 0;
        const titleLower = (job.jobTitle || '').toLowerCase();
        const descLower = (job.jobDescription || '').toLowerCase();
        const qualifications = (job.highlights?.qualifications || [])
          .join(' ')
          .toLowerCase();
        const searchable = `${descLower} ${qualifications}`;

        // Title match
        const titleSources = desiredRoles.length > 0 ? desiredRoles : [currentTitle];
        const titleHits = titleSources.filter(
          (r) => r && (titleLower.includes(r) || r.includes(titleLower))
        );
        score += Math.min(titleHits.length * 18, 35);

        // Skill match
        if (skills.length > 0) {
          const hits = skills.filter((s) => s && searchable.includes(s));
          score += Math.round((hits.length / skills.length) * 40);
        }

        // Work-mode match
        if (workModeSet.size > 0) {
          if (
            (job.isRemote && workModeSet.has('remote')) ||
            (!job.isRemote && (workModeSet.has('on-site') || workModeSet.has('hybrid')))
          ) {
            score += 15;
          }
        } else {
          score += 15; // no preference → no penalty
        }

        // Location match
        const jobLocationLower = (job.location || '').toLowerCase();
        if (preferredLocations.some((l) => jobLocationLower.includes(l))) {
          score += 10;
        } else if (preferredLocations.length === 0) {
          score += 10; // no preference → no penalty
        }

        return { ...job, relevanceScore: Math.min(score, 100) };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

module.exports = new JobSearchService();
