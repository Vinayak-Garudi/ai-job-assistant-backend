const axios = require('axios');
const AppError = require('../../utils/AppError');

const RAPIDAPI_HOST = 'linkedin-job-search-api.p.rapidapi.com';

// Maps our datePosted value to the correct endpoint path
// No monthly endpoint exists — /active-jb-7d is the widest window
const DATE_POSTED_ENDPOINT = {
  all: '/active-jb-7d',
  today: '/active-jb-24h',
  '3days': '/active-jb-7d',
  week: '/active-jb-7d',
  month: '/active-jb-7d',
  '1h': '/active-jb-1h',
};

const EMPLOYMENT_TYPE_MAP = {
  'Full Time': 'FULL_TIME',
  'Part Time': 'PART_TIME',
  Contract: 'CONTRACTOR',
  Internship: 'INTERN',
};

const WORK_MODE_MAP = {
  Remote: 'remote',
  Hybrid: 'hybrid',
  'On-site': 'on-site',
  'On Site': 'on-site',
};

class JobSearchApiService {
  constructor() {
    this.baseUrl = `https://${RAPIDAPI_HOST}`;
    this.apiKey = process.env.RAPIDAPI_KEY;
  }

  /**
   * Search jobs via LinkedIn Job Search API (RapidAPI)
   * @param {Object} params
   * @param {string} params.query - job title / keywords
   * @param {string} [params.location] - city, state, or country
   * @param {string[]} [params.employmentTypes] - e.g. ['Full Time', 'Contract']
   * @param {string[]} [params.workModes] - e.g. ['Remote', 'Hybrid']
   * @param {boolean} [params.remoteOnly] - restrict to remote jobs
   * @param {string} [params.datePosted] - 'all' | 'today' | '3days' | 'week' | 'month'
   * @param {number} [params.page] - 1-based page number
   * @param {number} [params.perPage] - results per page
   * @returns {Promise<Object[]>} - normalized job listings
   */
  async searchJobs({
    query,
    location,
    employmentTypes = [],
    workModes = [],
    remoteOnly = false,
    datePosted = 'week',
    page = 1,
    perPage = 10,
  }) {
    if (!this.apiKey) {
      throw new AppError(
        'RAPIDAPI_KEY is not configured. Please set it in your environment variables.',
        500
      );
    }

    const endpoint = DATE_POSTED_ENDPOINT[datePosted] || '/active-jb-7d';
    const offset = (page - 1) * perPage;

    const requestParams = {
      limit: String(perPage),
      offset: String(offset),
    };

    if (query) {
      requestParams.titleSearch = query;
    }

    if (location) {
      requestParams.locationSearch = location;
    }

    const mappedTypes = employmentTypes
      .map((t) => EMPLOYMENT_TYPE_MAP[t])
      .filter(Boolean);
    if (mappedTypes.length > 0) {
      requestParams.aiEmploymentTypeFilter = mappedTypes.join(',');
    }

    // Determine work arrangement filter
    const effectiveWorkModes = remoteOnly ? ['Remote'] : workModes;
    const mappedModes = effectiveWorkModes
      .map((m) => WORK_MODE_MAP[m])
      .filter(Boolean);
    if (mappedModes.length > 0) {
      requestParams.aiWorkArrangementFilter = mappedModes.join(',');
    }

    let response;
    try {
      response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: requestParams,
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': this.apiKey,
        },
        timeout: 15000,
      });
    } catch (err) {
      const status = err.response?.status;
      const apiMsg = err.response?.data?.message || '';
      if (status === 403) {
        throw new AppError(
          'Job search API access denied. Verify your RapidAPI subscription for linkedin-job-search-api is active.',
          503
        );
      }
      if (status === 429) {
        throw new AppError(
          apiMsg.includes('MONTHLY')
            ? 'Monthly job search API quota exceeded. Please upgrade your RapidAPI plan.'
            : 'Job search API rate limit exceeded. Please try again later.',
          429
        );
      }
      throw new AppError(`Job search API error: ${err.message}`, 502);
    }

    const jobs = Array.isArray(response.data) ? response.data : [];
    return jobs.map(this._normalizeJob.bind(this));
  }

  _normalizeJob(raw) {
    const workplaceType = (raw.workplace_type || raw.aiWorkArrangementFilter || '').toLowerCase();
    const location =
      (Array.isArray(raw.locations_derived) && raw.locations_derived[0]) ||
      raw.location ||
      'Not specified';

    return {
      jobId: raw.id || null,
      jobTitle: raw.title || '',
      company: raw.organization || raw.organization_name || '',
      companyLogo: raw.company_logo_url || null,
      companyWebsite: raw.company_website || raw.organization_url || null,
      location,
      isRemote: workplaceType === 'remote',
      employmentType: raw.employment_type || raw.aiEmploymentTypeFilter || null,
      jobUrl: raw.url || null,
      jobDescription: raw.description_text || raw.description_html || raw.description || '',
      highlights: {
        qualifications: [],
        responsibilities: [],
        benefits: [],
      },
      salary: raw.ai_salary_value || raw.salary || null,
      postedAt: raw.date_posted || raw.posted_date || null,
      source: 'LinkedIn',
    };
  }
}

module.exports = new JobSearchApiService();
