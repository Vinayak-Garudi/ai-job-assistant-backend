// Route configuration for the job-suggestions module.
// Rate limits are per user and live in job-suggestions.routes.js (they need
// req.user, which only exists after the auth middleware).
module.exports = {
  path: '/api/job-suggestions',

  enabled: true,

  description: 'Profile-based job suggestions sourced via Firecrawl',

  version: 'v1',
};
