/**
 * Job suggestions: Firecrawl search/scrape + OpenAI ranking, cached per user.
 * Firecrawl (axios), OpenAI and the Mongoose model are mocked — no network or
 * database access.
 */

jest.mock('axios');

const mockCreate = jest.fn();
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }))
);

let mockUser;
jest.mock('../src/middleware/auth', () =>
  jest.fn((req, res, next) => {
    req.user = mockUser;
    next();
  })
);

jest.mock('../src/modules/job-suggestions/job-suggestions.model', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const axios = require('axios');
const JobSuggestionSet = require('../src/modules/job-suggestions/job-suggestions.model');
const router = require('../src/modules/job-suggestions/job-suggestions.routes');
const service = require('../src/modules/job-suggestions/job-suggestions.service');
const errorHandler = require('../src/middleware/errorHandler');
const {
  isListingUrl,
  normalizeUrl,
  getSource,
} = require('../src/modules/job-suggestions/listing.utils');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/job-suggestions', router);
  app.use(errorHandler);
  return app;
};

let userCounter = 0;
const makeUser = (overrides = {}) => {
  userCounter += 1;
  const id = userCounter.toString(16).padStart(24, '0');
  return {
    _id: { toString: () => id },
    id,
    basicInfo: {
      username: 'Asha',
      email: 'asha@example.com',
      location: 'Bengaluru',
    },
    professionalInfo: {
      currentTitle: 'Frontend Engineer',
      experienceYears: 5,
      experienceMonths: 2,
      industry: 'Software',
    },
    otherInfo: { skills: ['React', 'TypeScript', 'Node.js'] },
    education: { degree: 'B.Tech' },
    jobPreferences: {
      desiredRoles: ['Senior React Developer'],
      preferredLocations: ['Bengaluru'],
      workModes: ['Remote', 'Hybrid'],
      jobTypes: ['Full Time'],
    },
    ...overrides,
  };
};

const lean = (value) => ({ lean: () => Promise.resolve(value) });

const SEARCH_RESULTS = [
  {
    url: 'https://in.linkedin.com/jobs/view/senior-react-developer-at-acme-4471283693',
    title: 'Senior React Developer | Bengaluru at Acme',
    description: 'Full-time role building React apps.',
  },
  {
    // Same posting via another LinkedIn subdomain + tracking params → deduped.
    url: 'https://www.linkedin.com/jobs/view/senior-react-developer-at-acme-4471283693/?utm_source=google&trk=abc',
    title: 'Senior React Developer | Acme',
    description: 'Duplicate',
  },
  {
    url: 'https://in.indeed.com/q-react-developer-l-bengaluru-jobs.html',
    title: '240 React Developer jobs in Bengaluru',
    description: 'Aggregate search page — must be dropped.',
  },
  {
    url: 'https://www.instagram.com/reel/DdrPpdyIM1y/',
    title: 'We are hiring React devs',
    description: 'Social post — must be dropped.',
  },
  {
    url: 'https://careers.globex.com/jobs/frontend-engineer-react-12345',
    title: 'Frontend Engineer (React) - Globex',
    description: 'Globex is hiring.',
  },
  {
    url: 'https://boards.greenhouse.io/initech/jobs/987654',
    title: 'Staff Engineer - Initech',
    description: 'Closed role.',
  },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mockFirecrawl = ({
  searchResults = SEARCH_RESULTS,
  scrapeByUrl = {},
  searchDelayMs = 0,
} = {}) => {
  axios.post.mockImplementation(async (url, body) => {
    if (url.endsWith('/search')) {
      await delay(searchDelayMs);
      return { data: { success: true, data: { web: searchResults } } };
    }
    if (url.endsWith('/scrape')) {
      return Promise.resolve({
        data: { success: true, data: { json: scrapeByUrl[body.url] ?? null } },
      });
    }
    return Promise.reject(new Error(`unexpected url ${url}`));
  });
};

const searchCalls = () =>
  axios.post.mock.calls.filter(([url]) => url.endsWith('/search'));
const scrapeCalls = () =>
  axios.post.mock.calls.filter(([url]) => url.endsWith('/scrape'));

const mockRanking = (jobs) =>
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ jobs }) } }],
  });

describe('listing.utils', () => {
  it.each([
    'https://in.linkedin.com/jobs/view/react-developer-at-acme-4471283693',
    'https://in.indeed.com/viewjob?jk=abc123',
    'https://www.naukri.com/job-listings-react-developer-acme-bengaluru-5-to-8-years-071025000123',
    'https://www.shine.com/jobs/senior-software-engineer/jp-morgan/19425561',
    'https://career.luxoft.com/jobs/senior-java-full-stack-developer-with-react-26916',
    'https://careers.quest-global.com/global/en/job/P-123212/Senior-Frontend-Developer',
    'https://jobs.lever.co/acme/1b2c3d4e-5f60-7182-93a4-b5c6d7e8f901',
    'https://boards.greenhouse.io/acme/jobs/4567890',
    'https://apna.co/job/bengaluru/custom-software-engineer-1372765843',
  ])('accepts individual listing %s', (url) => {
    expect(isListingUrl(url)).toBe(true);
  });

  it.each([
    'https://in.indeed.com/q-react-js-developer-l-bengaluru,-karnataka-jobs.html',
    'https://www.linkedin.com/jobs/search?keywords=react',
    'https://www.foundit.in/search/react-js-jobs-in-bengaluru-bangalore',
    'https://www.naukri.com/react-developer-jobs-in-bangalore',
    'https://www.instagram.com/reel/DdrPpdyIM1y/',
    'https://acme.com/careers',
    'https://acme.com/blog/how-we-hire',
    'ftp://acme.com/jobs/123',
    'not a url',
  ])('rejects non-listing %s', (url) => {
    expect(isListingUrl(url)).toBe(false);
  });

  it('normalizes subdomains, tracking params and trailing slashes for dedupe', () => {
    expect(
      normalizeUrl(
        'https://in.linkedin.com/jobs/view/x-123/?utm_source=a&trk=b'
      )
    ).toBe(normalizeUrl('https://www.linkedin.com/jobs/view/x-123'));
    expect(normalizeUrl('https://in.indeed.com/viewjob?jk=1')).not.toBe(
      normalizeUrl('https://in.indeed.com/viewjob?jk=2')
    );
  });

  it('names the source site', () => {
    expect(getSource('https://in.linkedin.com/jobs/view/1').name).toBe(
      'LinkedIn'
    );
    expect(getSource('https://careers.globex.com/jobs/abc-123')).toEqual({
      name: 'globex.com',
      domain: 'globex.com',
    });
  });
});

describe('job-suggestions service helpers', () => {
  it('builds a bounded set of queries from roles, locations and remote preference', () => {
    const profile = service.buildSearchProfile(
      makeUser({
        jobPreferences: {
          desiredRoles: [
            'Senior React Developer',
            'Frontend Lead',
            'UI Engineer',
            'Extra',
          ],
          preferredLocations: ['Bengaluru', 'Pune', 'Remote'],
          workModes: ['Hybrid'],
          jobTypes: [],
        },
      })
    );
    const queries = service.buildQueries(profile);

    expect(profile.remote).toBe(true);
    expect(profile.locations).toEqual(['Bengaluru', 'Pune']);
    expect(queries).toHaveLength(3);
    expect(queries[0]).toBe('Senior React Developer job opening in Bengaluru');
    expect(new Set(queries).size).toBe(3);
  });

  it('excludes PII from the search profile', () => {
    const profile = service.buildSearchProfile(makeUser());
    expect(JSON.stringify(profile)).not.toContain('asha@example.com');
    expect(JSON.stringify(profile)).not.toContain('Asha');
  });

  it('returns no queries when the profile has no role or title', () => {
    const profile = service.buildSearchProfile(
      makeUser({ professionalInfo: {}, jobPreferences: {} })
    );
    expect(service.buildQueries(profile)).toEqual([]);
  });
});

describe('Job Suggestions API', () => {
  const app = buildApp();
  const ORIGINAL_KEY = process.env.FIRECRAWL_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.FIRECRAWL_API_KEY = 'fc-test-key';
    mockUser = makeUser();
    JobSuggestionSet.findOne.mockReturnValue(lean(null));
    JobSuggestionSet.findOneAndUpdate.mockImplementation((filter, update) =>
      lean({ ...update })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.FIRECRAWL_API_KEY;
    else process.env.FIRECRAWL_API_KEY = ORIGINAL_KEY;
  });

  it('returns 503 with a clear message when FIRECRAWL_API_KEY is missing', async () => {
    delete process.env.FIRECRAWL_API_KEY;

    const res = await request(app).get('/api/job-suggestions').expect(503);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/FIRECRAWL_API_KEY/);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('serves fresh cached suggestions without spending Firecrawl credits', async () => {
    const profileHash = service.hashProfile(
      service.buildSearchProfile(mockUser)
    );
    JobSuggestionSet.findOne.mockReturnValue(
      lean({
        profileHash,
        queries: ['q'],
        suggestions: [{ title: 'Cached', url: 'https://x.com/jobs/1' }],
        rankedByAI: true,
        generatedAt: new Date(Date.now() - 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
    );

    const res = await request(app).get('/api/job-suggestions').expect(200);

    expect(res.body.data.fromCache).toBe(true);
    expect(res.body.data.suggestions[0].title).toBe('Cached');
    expect(axios.post).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('searches, filters, dedupes, verifies and ranks real listings on a cache miss', async () => {
    mockFirecrawl({
      scrapeByUrl: {
        'https://careers.globex.com/jobs/frontend-engineer-react-12345': {
          isJobPosting: true,
          isOpen: true,
          title: 'Frontend Engineer (React)',
          company: 'Globex',
          location: 'Bengaluru, India',
          workMode: 'Hybrid',
          summary: 'Build design systems in React.',
        },
        'https://boards.greenhouse.io/initech/jobs/987654': {
          isJobPosting: true,
          isOpen: false,
          title: 'Staff Engineer',
        },
      },
    });
    // index 0 = LinkedIn, 1 = Globex (greenhouse dropped as closed);
    // index 7 is a hallucination and must be ignored.
    mockRanking([
      {
        index: 0,
        isJobListing: true,
        title: 'Senior React Developer',
        company: 'Acme',
        location: 'Bengaluru',
        matchScore: 71,
        reason: 'Your React depth fits.',
      },
      {
        index: 1,
        isJobListing: true,
        title: 'ignored',
        company: 'ignored',
        location: '',
        matchScore: 92,
        reason: 'Strong fit for your stack.',
      },
      {
        index: 7,
        isJobListing: true,
        title: 'Made up',
        company: 'Nowhere',
        matchScore: 99,
        reason: 'x',
      },
    ]);

    const res = await request(app).get('/api/job-suggestions').expect(200);
    const { data } = res.body;

    // Bounded credit usage: ≤3 searches, scrapes only for non-LinkedIn listings.
    expect(searchCalls().length).toBeLessThanOrEqual(3);
    const [searchUrl, searchBody, searchConfig] = searchCalls()[0];
    expect(searchUrl).toBe('https://api.firecrawl.dev/v2/search');
    expect(searchBody).toMatchObject({
      sources: ['web'],
      tbs: 'qdr:m',
      limit: 10,
    });
    expect(searchConfig.headers.Authorization).toBe('Bearer fc-test-key');

    const scrapedUrls = scrapeCalls().map(([, body]) => body.url);
    expect(scrapedUrls.length).toBeLessThanOrEqual(4);
    expect(scrapedUrls.some((u) => u.includes('linkedin.com'))).toBe(false);
    expect(scrapeCalls()[0][1].formats[0]).toMatchObject({ type: 'json' });

    expect(data.fromCache).toBe(false);
    expect(data.rankedByAI).toBe(true);
    expect(data.suggestions).toHaveLength(2);
    expect(data.suggestions.map((s) => s.matchScore)).toEqual([92, 71]);

    const [globex, acme] = data.suggestions;
    expect(globex).toMatchObject({
      title: 'Frontend Engineer (React)',
      company: 'Globex',
      url: 'https://careers.globex.com/jobs/frontend-engineer-react-12345',
      source: { name: 'globex.com', domain: 'globex.com' },
      verified: true,
    });
    expect(acme).toMatchObject({
      company: 'Acme',
      source: { name: 'LinkedIn', domain: 'linkedin.com' },
      verified: false,
    });
    data.suggestions.forEach((s) => expect(isListingUrl(s.url)).toBe(true));
    expect(JSON.stringify(data)).not.toContain('Nowhere');

    // Persisted per user via upsert with an expiry.
    const [filter, update, options] =
      JobSuggestionSet.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ userId: mockUser._id.toString() });
    expect(options.upsert).toBe(true);
    expect(new Date(update.expiresAt) > new Date(update.generatedAt)).toBe(
      true
    );

    // The ranking prompt never contains the user's email.
    const prompt = mockCreate.mock.calls[0][0].messages[1].content;
    expect(prompt).not.toContain('asha@example.com');
  });

  it('regenerates when the cache has expired', async () => {
    const profileHash = service.hashProfile(
      service.buildSearchProfile(mockUser)
    );
    JobSuggestionSet.findOne.mockReturnValue(
      lean({
        profileHash,
        suggestions: [],
        generatedAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      })
    );
    mockFirecrawl({ searchResults: [] });

    const res = await request(app).get('/api/job-suggestions').expect(200);

    expect(res.body.data.fromCache).toBe(false);
    expect(res.body.data.suggestions).toEqual([]);
    expect(searchCalls().length).toBeGreaterThan(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('shares one in-flight generation between concurrent requests', async () => {
    mockFirecrawl({ searchResults: [], searchDelayMs: 200 });

    await Promise.all([
      request(app).get('/api/job-suggestions').expect(200),
      request(app).get('/api/job-suggestions').expect(200),
    ]);

    expect(JobSuggestionSet.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('returns 422 when the profile has no role or title to search for', async () => {
    mockUser = makeUser({ professionalInfo: {}, jobPreferences: {} });

    const res = await request(app).get('/api/job-suggestions').expect(422);

    expect(res.body.message).toMatch(/desired role/i);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('maps Firecrawl 402 (out of credits) to a 503 without leaking upstream details', async () => {
    const err = new Error('Request failed with status code 402');
    err.response = {
      status: 402,
      data: { error: 'Payment required secret-detail' },
    };
    axios.post.mockRejectedValue(err);

    const res = await request(app).get('/api/job-suggestions').expect(503);

    expect(res.body.message).toMatch(/out of credits/);
    expect(res.body.message).not.toMatch(/secret-detail/);
  });

  it('falls back to unranked listings when OpenAI fails', async () => {
    mockFirecrawl({ searchResults: SEARCH_RESULTS.slice(0, 1) });
    mockCreate.mockRejectedValue(new Error('boom'));

    const res = await request(app).get('/api/job-suggestions').expect(200);

    expect(res.body.data.rankedByAI).toBe(false);
    expect(res.body.data.suggestions).toHaveLength(1);
    expect(res.body.data.suggestions[0]).toMatchObject({
      title: 'Senior React Developer',
      matchScore: null,
    });
  });

  it('refresh bypasses a fresh cache', async () => {
    const profileHash = service.hashProfile(
      service.buildSearchProfile(mockUser)
    );
    JobSuggestionSet.findOne.mockReturnValue(
      lean({
        profileHash,
        suggestions: [],
        generatedAt: new Date(Date.now() - 30 * 60 * 1000),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
    );
    mockFirecrawl({ searchResults: [] });

    const res = await request(app)
      .post('/api/job-suggestions/refresh')
      .expect(200);

    expect(res.body.data.fromCache).toBe(false);
    expect(searchCalls().length).toBeGreaterThan(0);
  });

  it('refresh within the cooldown is rejected with 429 and spends nothing', async () => {
    JobSuggestionSet.findOne.mockReturnValue(
      lean({
        profileHash: 'x',
        suggestions: [],
        generatedAt: new Date(Date.now() - 60 * 1000),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
    );

    const res = await request(app)
      .post('/api/job-suggestions/refresh')
      .expect(429);

    expect(res.body.message).toMatch(/refresh again in \d+ minute/);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('rejects unexpected input', async () => {
    await request(app).get('/api/job-suggestions?foo=bar').expect(400);
    await request(app)
      .post('/api/job-suggestions/refresh')
      .send({ query: 'anything' })
      .expect(400);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
