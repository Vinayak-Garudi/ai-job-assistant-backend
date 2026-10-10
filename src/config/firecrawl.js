// Read lazily so the key can be rotated (or set in tests) without a restart.
module.exports = {
  get apiKey() {
    return process.env.FIRECRAWL_API_KEY || '';
  },
  baseUrl: 'https://api.firecrawl.dev/v2',

  // Credit budget per generation: search = 2 credits per 10 results,
  // JSON-format scrape = 5 credits per page (1 base + 4 JSON).
  maxQueries: 3,
  resultsPerQuery: 10,
  maxScrapes: 4,

  searchTimeoutMs: 30000,
  scrapeTimeoutMs: 30000,
};
