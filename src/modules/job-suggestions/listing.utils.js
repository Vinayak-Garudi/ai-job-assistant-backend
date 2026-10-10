// Heuristics for telling an individual job listing apart from search-results
// pages, aggregator category pages, social posts and articles. Search engines
// return all of these for "<role> jobs <city>" queries, but only a single
// listing is something the user can actually open and apply to.

const KNOWN_SOURCES = [
  {
    domain: 'linkedin.com',
    name: 'LinkedIn',
    listing: /^\/jobs\/view\/[^/]+/,
  },
  {
    domain: 'indeed.com',
    name: 'Indeed',
    listing: /^\/(viewjob|rc\/clk|pagead\/clk)/,
    listingParam: 'jk',
  },
  { domain: 'naukri.com', name: 'Naukri', listing: /^\/job-listings-/ },
  {
    domain: 'glassdoor.com',
    name: 'Glassdoor',
    listing: /^\/(job-listing\/|partner\/joblisting)/,
  },
  { domain: 'glassdoor.co.in', name: 'Glassdoor', listing: /^\/job-listing\// },
  { domain: 'foundit.in', name: 'foundit', listing: /^\/job\/[^/]+/ },
  { domain: 'shine.com', name: 'Shine', listing: /^\/jobs\/[^/]+\/[^/]+\/\d+/ },
  {
    domain: 'monster.com',
    name: 'Monster',
    listing: /^\/job-openings?\/[^/]+/,
  },
  { domain: 'wellfound.com', name: 'Wellfound', listing: /^\/jobs\/\d+/ },
  { domain: 'instahyre.com', name: 'Instahyre', listing: /^\/job-\d+/ },
  {
    domain: 'internshala.com',
    name: 'Internshala',
    listing: /^\/(internship|job)\/detail\//,
  },
  { domain: 'cutshort.io', name: 'Cutshort', listing: /^\/job\/[^/]+/ },
  { domain: 'hirist.tech', name: 'Hirist', listing: /^\/j\/[^/]+/ },
  {
    domain: 'ziprecruiter.com',
    name: 'ZipRecruiter',
    listing: /^\/(c\/[^/]+\/job\/|jobs\/[^/]+\/[^/]+)/,
  },
  { domain: 'dice.com', name: 'Dice', listing: /^\/job-detail\// },
  { domain: 'builtin.com', name: 'Built In', listing: /^\/job\/[^/]+/ },
  {
    domain: 'remoteok.com',
    name: 'Remote OK',
    listing: /^\/remote-jobs\/[^/]*\d+/,
  },
  {
    domain: 'weworkremotely.com',
    name: 'We Work Remotely',
    listing: /^\/remote-jobs\/[^/]+/,
  },
  { domain: 'greenhouse.io', name: 'Greenhouse', listing: /\/jobs\/\d+/ },
  { domain: 'lever.co', name: 'Lever', listing: /^\/[^/]+\/[0-9a-f-]{20,}/ },
  { domain: 'ashbyhq.com', name: 'Ashby', listing: /^\/[^/]+\/[0-9a-f-]{20,}/ },
  { domain: 'myworkdayjobs.com', name: 'Workday', listing: /\/job\/[^/]+/ },
  {
    domain: 'smartrecruiters.com',
    name: 'SmartRecruiters',
    listing: /^\/[^/]+\/\d+/,
  },
  { domain: 'workable.com', name: 'Workable', listing: /\/j\/[0-9A-F]+/i },
  { domain: 'apna.co', name: 'apna', listing: /^\/job\/[^/]+\/[^/]+/ },
];

// Never a listing the user can apply on.
const BLOCKED_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'reddit.com',
  'quora.com',
  'medium.com',
  'wikipedia.org',
  'ambitionbox.com',
  'payscale.com',
  'levels.fyi',
  'tiktok.com',
  'pinterest.com',
];

const GENERIC_JOB_SEGMENT =
  /\/(?:job|jobs|careers?|positions?|openings?|vacanc(?:y|ies)|requisitions?|job-detail|jobdetail|opportunit(?:y|ies))\/(.+)/;

const AGGREGATE_PATH =
  /(\/search\b|\/q-|-jobs(\.html?)?\/?$|\/jobs-in-|\/jobs\/?$|\/careers\/?$|\/browse\b|\/category\/|\/salar(y|ies)\b|\/blog\/|\/companies?\/?$)/;

const SEARCH_PARAMS = ['q', 'keywords', 'k', 'query', 'search'];

const TRACKING_PARAM =
  /^(utm_|ref|refid|src|source|trk|tracking|from|origin|gclid|fbclid)/i;

const hostMatches = (hostname, domain) =>
  hostname === domain || hostname.endsWith(`.${domain}`);

const bareHost = (hostname) => hostname.toLowerCase().replace(/^www\./, '');

const parse = (url) => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
};

function findKnownSource(hostname) {
  return KNOWN_SOURCES.find((source) => hostMatches(hostname, source.domain));
}

function isListingUrl(url) {
  const parsed = parse(url);
  if (!parsed) return false;

  const hostname = bareHost(parsed.hostname);
  if (BLOCKED_DOMAINS.some((domain) => hostMatches(hostname, domain))) {
    return false;
  }

  const path = parsed.pathname.toLowerCase();
  const known = findKnownSource(hostname);
  if (known) {
    if (known.listingParam && parsed.searchParams.get(known.listingParam)) {
      return true;
    }
    return known.listing.test(parsed.pathname);
  }

  if (AGGREGATE_PATH.test(path)) return false;
  if (SEARCH_PARAMS.some((param) => parsed.searchParams.has(param))) {
    return false;
  }

  // Company careers sites / unknown ATSs: a job-ish segment followed by
  // something that identifies one posting (an id, or a descriptive slug).
  const match = path.match(GENERIC_JOB_SEGMENT);
  if (!match) return false;
  const rest = match[1].replace(/\/$/, '');
  return /\d/.test(rest) || rest.length >= 15;
}

function getSource(url) {
  const parsed = parse(url);
  if (!parsed) return { name: 'Job listing', domain: '' };

  const hostname = bareHost(parsed.hostname);
  const known = findKnownSource(hostname);
  if (known) return { name: known.name, domain: known.domain };

  // careers.acme.com / jobs.acme.com / acme.com → "acme.com"
  const labels = hostname.split('.');
  const domain =
    labels.length > 2 &&
    ['careers', 'career', 'jobs', 'job', 'apply'].includes(labels[0])
      ? labels.slice(1).join('.')
      : hostname;
  return { name: domain, domain };
}

/** Canonical form used to dedupe the same posting found via different queries. */
function normalizeUrl(url) {
  const parsed = parse(url);
  if (!parsed) return null;

  let hostname = bareHost(parsed.hostname);
  // in.linkedin.com / uk.linkedin.com / www.linkedin.com are the same posting.
  if (hostMatches(hostname, 'linkedin.com')) hostname = 'linkedin.com';
  if (hostMatches(hostname, 'indeed.com')) hostname = 'indeed.com';

  const params = [...parsed.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAM.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.length
    ? `?${new URLSearchParams(params).toString()}`
    : '';
  const path = parsed.pathname.replace(/\/+$/, '') || '/';
  return `${hostname}${path}${query}`;
}

module.exports = { isListingUrl, getSource, normalizeUrl };
