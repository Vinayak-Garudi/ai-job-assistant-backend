const axios = require('axios');
const AppError = require('../../utils/AppError');

const JSEARCH_HOST = 'jsearch.p.rapidapi.com';

// Maps our internal job type labels to JSearch employment_types values
const EMPLOYMENT_TYPE_MAP = {
  'Full Time': 'FULLTIME',
  'Part Time': 'PARTTIME',
  Contract: 'CONTRACTOR',
  Internship: 'INTERN',
};

// Normalises whatever JSearch returns for job_employment_type to our display labels.
// JSearch currently returns human-readable strings ("Full-time", "Contractor", …)
// but the API docs list ENUM values, so we handle both to be safe.
function normaliseEmploymentType(raw) {
  if (!raw) return null;
  const map = {
    'full-time': 'Full Time',
    fulltime: 'Full Time',
    'part-time': 'Part Time',
    parttime: 'Part Time',
    contractor: 'Contract',
    contract: 'Contract',
    internship: 'Internship',
    intern: 'Internship',
  };
  return map[raw.toLowerCase()] ?? raw;
}

// JSearch date_posted values match our internal values directly:
// 'all' | 'today' | '3days' | 'week' | 'month'

class JobSearchApiService {
  constructor() {
    this.baseUrl = `https://${JSEARCH_HOST}`;
    this.apiKey = process.env.RAPIDAPI_KEY;
  }

  /**
   * Search jobs via JSearch API (RapidAPI) — backed by Google Jobs.
   * Aggregates listings from LinkedIn, Indeed, ZipRecruiter, Glassdoor, and more.
   *
   * @param {Object} params
   * @param {string} params.query           - job title / keywords
   * @param {string} [params.location]      - city, state, or country (embedded into query)
   * @param {string[]} [params.employmentTypes] - e.g. ['Full Time', 'Contract']
   * @param {boolean} [params.remoteOnly]   - restrict to remote jobs
   * @param {string} [params.datePosted]    - 'all' | 'today' | '3days' | 'week' | 'month'
   * @param {number} [params.page]          - 1-based page number
   * @param {number} [params.perPage]       - results per page (max 10 per JSearch page)
   * @returns {Promise<Object[]>}           - normalized job listings
   */
  async searchJobs({
    query,
    location,
    employmentTypes = [],
    remoteOnly = false,
    datePosted = 'month',
    page = 1,
    perPage = 10,
  }) {
    if (!this.apiKey) {
      throw new AppError(
        'RAPIDAPI_KEY is not configured. Please set it in your environment variables.',
        500
      );
    }

    // JSearch takes location as part of the query string
    const searchQuery = location ? `${query} in ${location}` : query;

    const requestParams = {
      query: searchQuery,
      page: String(page),
      num_pages: '1',
      date_posted: datePosted,
    };

    if (remoteOnly) {
      requestParams.remote_jobs_only = 'true';
    }

    const mappedTypes = employmentTypes
      .map((t) => EMPLOYMENT_TYPE_MAP[t])
      .filter(Boolean);
    if (mappedTypes.length > 0) {
      requestParams.employment_types = mappedTypes.join(',');
    }

    let response;
    try {
      response = await axios.get(`${this.baseUrl}/search`, {
        params: requestParams,
        headers: {
          'x-rapidapi-host': JSEARCH_HOST,
          'x-rapidapi-key': this.apiKey,
        },
        timeout: 15000,
      });
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        throw new AppError(
          'Job search API access denied. Verify your RapidAPI subscription for JSearch is active.',
          503
        );
      }
      if (status === 429) {
        throw new AppError(
          'Job search API rate limit exceeded. Please try again later.',
          429
        );
      }
      throw new AppError(`Job search API error: ${err.message}`, 502);
    }

    const jobs = Array.isArray(response.data?.data) ? response.data.data : [];
    return jobs.slice(0, perPage).map(this._normalizeJob.bind(this));
  }

  _normalizeJob(raw) {
    const locationParts = [raw.job_city, raw.job_state, raw.job_country].filter(Boolean);
    const location = locationParts.length > 0 ? locationParts.join(', ') : 'Not specified';

    const hasSalary = raw.job_min_salary != null || raw.job_max_salary != null;

    return {
      jobId: raw.job_id || null,
      jobTitle: raw.job_title || '',
      company: raw.employer_name || '',
      companyLogo: raw.employer_logo || null,
      companyWebsite: raw.employer_website || null,
      location,
      isRemote: raw.job_is_remote || false,
      employmentType: normaliseEmploymentType(raw.job_employment_type),
      jobUrl: raw.job_apply_link || null,
      jobDescription: raw.job_description || '',
      highlights: {
        qualifications: raw.job_highlights?.Qualifications || [],
        responsibilities: raw.job_highlights?.Responsibilities || [],
        benefits: raw.job_highlights?.Benefits || [],
      },
      salary: hasSalary
        ? {
            min: raw.job_min_salary ?? null,
            max: raw.job_max_salary ?? null,
            currency: raw.job_salary_currency || 'USD',
            period: raw.job_salary_period || null,
          }
        : null,
      postedAt: raw.job_posted_at_datetime_utc || null,
      source: raw.job_publisher || 'JSearch',
    };
  }
}

module.exports = new JobSearchApiService();
