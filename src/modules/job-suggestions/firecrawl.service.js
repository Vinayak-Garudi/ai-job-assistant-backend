const axios = require('axios');
const firecrawlConfig = require('../../config/firecrawl');
const AppError = require('../../utils/AppError');
const { retryWithBackoff } = require('../../utils/retryWithBackoff');

const LISTING_SCHEMA = {
  type: 'object',
  properties: {
    isJobPosting: { type: 'boolean' },
    isOpen: { type: 'boolean' },
    title: { type: 'string' },
    company: { type: 'string' },
    location: { type: 'string' },
    workMode: { type: 'string' },
    employmentType: { type: 'string' },
    postedDate: { type: 'string' },
    summary: { type: 'string' },
  },
  required: ['isJobPosting', 'title'],
};

const LISTING_PROMPT =
  'Extract the details of this job posting. Set isJobPosting to false if the page is a list of many jobs, a search results page, an article, or anything other than one specific job opening. Set isOpen to false if the page says the job is closed, expired, filled, or no longer accepting applications. summary: at most 3 sentences covering the role and key requirements.';

const isRetryable = (error) => {
  const status = error?.response?.status;
  return (
    status === 429 ||
    status === 502 ||
    status === 503 ||
    error?.code === 'ECONNRESET' ||
    error?.code === 'ETIMEDOUT'
  );
};

class FirecrawlService {
  isConfigured() {
    return Boolean(firecrawlConfig.apiKey);
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      throw new AppError(
        'Job suggestions are not available yet: the server is missing its Firecrawl API key (FIRECRAWL_API_KEY).',
        503
      );
    }
  }

  async _post(path, body, timeoutMs) {
    const response = await retryWithBackoff(
      () =>
        axios.post(`${firecrawlConfig.baseUrl}${path}`, body, {
          headers: {
            Authorization: `Bearer ${firecrawlConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
          // Leave headroom over Firecrawl's own server-side timeout.
          timeout: timeoutMs + 15000,
        }),
      {
        maxRetries: 2,
        baseDelay: 1500,
        maxDelay: 8000,
        shouldRetry: isRetryable,
      }
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Firecrawl request failed');
    }
    return response.data;
  }

  /**
   * Translate Firecrawl failures into client-safe AppErrors. Account-level
   * problems (bad key, no credits) abort the whole generation; anything else
   * is reported generically so upstream messages never reach the client.
   */
  toAppError(error) {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      return new AppError(
        'Job search is misconfigured: the Firecrawl API key was rejected.',
        503
      );
    }
    if (status === 402) {
      return new AppError(
        'Job search is temporarily unavailable: the Firecrawl account is out of credits.',
        503
      );
    }
    if (status === 429) {
      return new AppError(
        'Job search is busy right now. Please try again in a minute.',
        429
      );
    }
    return new AppError(
      'Could not reach the job search service. Please try again shortly.',
      502
    );
  }

  isAccountError(error) {
    return [401, 402, 403].includes(error?.response?.status);
  }

  /**
   * POST /v2/search — returns [{ url, title, description }].
   */
  async search(query, { limit = firecrawlConfig.resultsPerQuery, tbs } = {}) {
    const body = {
      query,
      limit,
      sources: ['web'],
      ignoreInvalidURLs: true,
      timeout: firecrawlConfig.searchTimeoutMs,
    };
    if (tbs) body.tbs = tbs;

    const data = await this._post(
      '/search',
      body,
      firecrawlConfig.searchTimeoutMs
    );
    return (data.data?.web || [])
      .filter((item) => item && typeof item.url === 'string')
      .map((item) => ({
        url: item.url,
        title: item.title || '',
        description: item.description || '',
      }));
  }

  /**
   * POST /v2/scrape with a JSON-format extraction of a single job listing.
   * Returns the extracted object (data.json) or null.
   */
  async scrapeListing(url) {
    const data = await this._post(
      '/scrape',
      {
        url,
        formats: [
          { type: 'json', schema: LISTING_SCHEMA, prompt: LISTING_PROMPT },
        ],
        onlyMainContent: true,
        timeout: firecrawlConfig.scrapeTimeoutMs,
      },
      firecrawlConfig.scrapeTimeoutMs
    );
    return data.data?.json || null;
  }
}

module.exports = new FirecrawlService();
