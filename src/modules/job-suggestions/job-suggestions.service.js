const crypto = require('crypto');
const OpenAI = require('openai');
const JobSuggestionSet = require('./job-suggestions.model');
const firecrawlService = require('./firecrawl.service');
const { isListingUrl, getSource, normalizeUrl } = require('./listing.utils');
const firecrawlConfig = require('../../config/firecrawl');
const openaiConfig = require('../../config/openai');
const AppError = require('../../utils/AppError');
const apiMonitor = require('../../utils/apiMonitor');
const { retryWithBackoff } = require('../../utils/retryWithBackoff');

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_CANDIDATES = 20;
const MAX_SUGGESTIONS = 12;
// Firecrawl does not support LinkedIn; scraping it only burns credits.
const UNSCRAPABLE_DOMAINS = ['linkedin.com'];

const unique = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const cleanList = (values) =>
  unique(
    (Array.isArray(values) ? values : [])
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean)
  );

const clip = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

class JobSuggestionsService {
  constructor() {
    this._openai = null;
    this._inFlight = new Map();
  }

  get openai() {
    if (!this._openai) {
      this._openai = new OpenAI({ apiKey: openaiConfig.apiKey });
    }
    return this._openai;
  }

  /**
   * Only the profile fields that influence searching and ranking — no PII.
   */
  buildSearchProfile(user) {
    const prefs = user.jobPreferences || {};
    const professional = user.professionalInfo || {};

    const rawLocations = cleanList([
      ...(prefs.preferredLocations || []),
      user.basicInfo?.location,
    ]);
    const workModes = cleanList(prefs.workModes);
    const remote =
      workModes.includes('Remote') ||
      rawLocations.some((loc) => /^remote$/i.test(loc));

    return {
      roles: cleanList([
        ...(prefs.desiredRoles || []),
        professional.currentTitle,
      ]),
      currentTitle: clip(professional.currentTitle, 100),
      experienceYears: professional.experienceYears || 0,
      experienceMonths: professional.experienceMonths || 0,
      industry: clip(professional.industry, 100),
      skills: cleanList(user.otherInfo?.skills).slice(0, 25),
      degree: clip(user.education?.degree, 100),
      locations: rawLocations.filter((loc) => !/^remote$/i.test(loc)),
      remote,
      workModes,
      jobTypes: cleanList(prefs.jobTypes),
    };
  }

  hashProfile(profile) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(profile))
      .digest('hex');
  }

  buildQueries(profile) {
    const roles = profile.roles.slice(0, firecrawlConfig.maxQueries);
    if (roles.length === 0) return [];

    let typeHint = '';
    if (profile.jobTypes.length === 1 && profile.jobTypes[0] === 'Internship') {
      typeHint = 'internship';
    } else if (
      profile.jobTypes.length === 1 &&
      profile.jobTypes[0] === 'Contract'
    ) {
      typeHint = 'contract';
    }

    const places = [...profile.locations.slice(0, 2)];
    if (profile.remote) places.push('remote');
    if (places.length === 0) places.push(null);

    // Interleave role/place pairs so the first few queries cover different
    // roles and different places rather than every place for role #1.
    const pairs = [];
    roles.forEach((role, roleIndex) =>
      places.forEach((place, placeIndex) =>
        pairs.push({ role, place, rank: roleIndex + placeIndex })
      )
    );
    pairs.sort((a, b) => a.rank - b.rank);

    const queries = pairs.map(({ role, place }) => {
      const what = [role, typeHint || 'job'].join(' ');
      if (!place) return `${what} opening`;
      if (place === 'remote') return `remote ${what} opening`;
      return `${what} opening in ${place}`;
    });

    return unique(queries).slice(0, firecrawlConfig.maxQueries);
  }

  /**
   * Returns the cached suggestions when they are still valid, otherwise runs a
   * new search. `forceRefresh` bypasses the cache but not the cooldown.
   */
  async getSuggestions(user, { forceRefresh = false } = {}) {
    const userId = user._id.toString();
    const profile = this.buildSearchProfile(user);
    const profileHash = this.hashProfile(profile);

    const existing = await JobSuggestionSet.findOne({ userId }).lean();
    const now = Date.now();
    const inCooldown =
      existing &&
      now - new Date(existing.generatedAt).getTime() < REFRESH_COOLDOWN_MS;

    if (forceRefresh && inCooldown && !this._inFlight.has(userId)) {
      const waitMs =
        new Date(existing.generatedAt).getTime() + REFRESH_COOLDOWN_MS - now;
      const minutes = Math.max(1, Math.ceil(waitMs / 60000));
      throw new AppError(
        `Suggestions were just refreshed. You can refresh again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        429
      );
    }

    const isFresh =
      existing &&
      new Date(existing.expiresAt).getTime() > now &&
      (existing.profileHash === profileHash || inCooldown);

    if (!forceRefresh && isFresh) {
      return this.toResponse(existing, true);
    }

    // A reload while a search is already running joins it instead of
    // spending credits on a duplicate search.
    if (!this._inFlight.has(userId)) {
      const job = this.generate(userId, profile, profileHash).finally(() =>
        this._inFlight.delete(userId)
      );
      this._inFlight.set(userId, job);
    }
    const doc = await this._inFlight.get(userId);
    return this.toResponse(doc, false);
  }

  async generate(userId, profile, profileHash) {
    firecrawlService.assertConfigured();

    const queries = this.buildQueries(profile);
    if (queries.length === 0) {
      throw new AppError(
        'Add a desired role or your current job title to your profile so we know which jobs to look for.',
        422
      );
    }

    const candidates = await this.collectCandidates(queries);
    const enriched = await this.enrichCandidates(candidates);
    const { suggestions, rankedByAI } = await this.rankCandidates(
      profile,
      enriched
    );

    const generatedAt = new Date();
    return JobSuggestionSet.findOneAndUpdate(
      { userId },
      {
        userId,
        profileHash,
        queries,
        suggestions,
        rankedByAI,
        generatedAt,
        expiresAt: new Date(generatedAt.getTime() + CACHE_TTL_MS),
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();
  }

  async collectCandidates(queries) {
    const results = await Promise.allSettled(
      queries.map((query) => firecrawlService.search(query, { tbs: 'qdr:m' }))
    );

    const failures = results.filter((r) => r.status === 'rejected');
    const accountFailure = failures.find((r) =>
      firecrawlService.isAccountError(r.reason)
    );
    if (accountFailure)
      throw firecrawlService.toAppError(accountFailure.reason);
    if (failures.length === results.length) {
      console.error(
        'Job suggestions: all searches failed:',
        failures[0].reason?.message
      );
      throw firecrawlService.toAppError(failures[0].reason);
    }

    // Round-robin across queries so one query cannot crowd out the others.
    const perQuery = results.map((r) =>
      r.status === 'fulfilled'
        ? r.value.filter((item) => isListingUrl(item.url))
        : []
    );
    const seen = new Set();
    const candidates = [];
    const longest = Math.max(...perQuery.map((list) => list.length));
    for (let i = 0; i < longest && candidates.length < MAX_CANDIDATES; i++) {
      for (const list of perQuery) {
        const item = list[i];
        if (!item) continue;
        const key = normalizeUrl(item.url);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        candidates.push({ ...item, source: getSource(item.url) });
        if (candidates.length >= MAX_CANDIDATES) break;
      }
    }
    return candidates;
  }

  /**
   * Scrape a bounded number of listings to confirm they are real, open
   * postings and pull structured details. Unscraped candidates keep their
   * search-result title/snippet.
   */
  async enrichCandidates(candidates) {
    const toScrape = candidates
      .filter((c) => !UNSCRAPABLE_DOMAINS.includes(c.source.domain))
      .slice(0, firecrawlConfig.maxScrapes);

    const scraped = await Promise.allSettled(
      toScrape.map((c) => firecrawlService.scrapeListing(c.url))
    );

    const details = new Map();
    scraped.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value) {
        details.set(toScrape[i].url, result.value);
      } else if (result.status === 'rejected') {
        console.warn(
          `Job suggestions: scrape failed for ${toScrape[i].url}: ${result.reason?.message}`
        );
      }
    });

    return candidates
      .map((candidate) => {
        const extracted = details.get(candidate.url);
        if (!extracted) return { ...candidate, verified: false };
        if (extracted.isJobPosting === false || extracted.isOpen === false) {
          return null;
        }
        return {
          ...candidate,
          verified: true,
          extracted: {
            title: clip(extracted.title, 200),
            company: clip(extracted.company, 200),
            location: clip(extracted.location, 200),
            workMode: clip(extracted.workMode, 50),
            employmentType: clip(extracted.employmentType, 50),
            postedDate: clip(extracted.postedDate, 50),
            summary: clip(extracted.summary, 600),
          },
        };
      })
      .filter(Boolean);
  }

  buildRankingPrompt(profile, candidates) {
    const experience = `${profile.experienceYears} years ${profile.experienceMonths} months`;
    const profileLines = [
      `Current title: ${profile.currentTitle || 'not specified'}`,
      `Experience: ${experience}`,
      `Desired roles: ${profile.roles.join(', ') || 'not specified'}`,
      `Skills: ${profile.skills.join(', ') || 'not specified'}`,
      `Industry: ${profile.industry || 'not specified'}`,
      `Education: ${profile.degree || 'not specified'}`,
      `Preferred locations: ${profile.locations.join(', ') || 'not specified'}`,
      `Work modes: ${profile.workModes.join(', ') || 'any'}`,
      `Job types: ${profile.jobTypes.join(', ') || 'any'}`,
    ];

    const listings = candidates.map((c, index) => ({
      index,
      site: c.source.name,
      searchTitle: clip(c.title, 200),
      searchSnippet: clip(c.description, 400),
      ...(c.extracted ? { pageDetails: c.extracted } : {}),
    }));

    return `Candidate profile:\n${profileLines.join('\n')}\n\nJob listings found on the web (JSON):\n${JSON.stringify(listings)}\n\nFor EVERY listing return an object with:\n- "index": the listing's index\n- "isJobListing": false if this is not one specific job opening (e.g. a list of jobs, an article, a company page)\n- "title", "company", "location": parsed from the listing (empty string if unknown; never invent a company)\n- "matchScore": integer 0-100 for how well the candidate fits, judging skills, seniority/experience, role, location and work-mode preferences. Be realistic: a seniority or location mismatch should lower the score substantially.\n- "reason": one sentence (max 160 characters) addressed to the candidate ("you") explaining the fit.\n\nRespond with JSON only: {"jobs": [ ... ]}`;
  }

  async rankCandidates(profile, candidates) {
    if (candidates.length === 0) return { suggestions: [], rankedByAI: true };

    let ranked;
    try {
      apiMonitor.recordCall();
      const completion = await retryWithBackoff(
        () =>
          this.openai.chat.completions.create({
            model: openaiConfig.model,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert technical recruiter who matches candidates to job openings. You only describe listings you are given and never invent jobs, companies or URLs.',
              },
              {
                role: 'user',
                content: this.buildRankingPrompt(profile, candidates),
              },
            ],
          }),
        {
          maxRetries: 3,
          baseDelay: 2000,
          maxDelay: 30000,
        }
      );
      const parsed = JSON.parse(completion.choices[0].message.content);
      ranked = Array.isArray(parsed?.jobs) ? parsed.jobs : [];
      apiMonitor.recordSuccess();
    } catch (error) {
      apiMonitor.recordFailure(error);
      console.error(
        'Job suggestions: ranking failed, returning unranked results:',
        error.message
      );
      return {
        suggestions: candidates
          .slice(0, MAX_SUGGESTIONS)
          .map((c) => this.toSuggestion(c, null)),
        rankedByAI: false,
      };
    }

    // The model refers to listings by index, so a URL can only ever come from
    // a real search result — never from the model.
    const used = new Set();
    const suggestions = ranked
      .filter(
        (job) =>
          Number.isInteger(job?.index) &&
          job.index >= 0 &&
          job.index < candidates.length &&
          job.isJobListing !== false &&
          !used.has(job.index) &&
          used.add(job.index)
      )
      .map((job) => this.toSuggestion(candidates[job.index], job))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, MAX_SUGGESTIONS);

    return { suggestions, rankedByAI: true };
  }

  toSuggestion(candidate, ranking) {
    const extracted = candidate.extracted || {};
    const fallbackTitle = clip(candidate.title.split(/\s+[|–]\s+/)[0], 200);
    const score = Number(ranking?.matchScore);

    return {
      title:
        extracted.title ||
        clip(ranking?.title, 200) ||
        fallbackTitle ||
        'Job opening',
      company: extracted.company || clip(ranking?.company, 200),
      location: extracted.location || clip(ranking?.location, 200),
      url: candidate.url,
      source: candidate.source,
      snippet: extracted.summary || clip(candidate.description, 400),
      workMode: extracted.workMode || '',
      employmentType: extracted.employmentType || '',
      postedDate: extracted.postedDate || '',
      matchScore: Number.isFinite(score)
        ? Math.min(100, Math.max(0, Math.round(score)))
        : null,
      matchReason: clip(ranking?.reason, 300),
      verified: Boolean(candidate.verified),
    };
  }

  toResponse(doc, fromCache) {
    const generatedAt = new Date(doc.generatedAt);
    return {
      suggestions: doc.suggestions || [],
      queries: doc.queries || [],
      rankedByAI: doc.rankedByAI !== false,
      generatedAt,
      expiresAt: doc.expiresAt,
      nextRefreshAt: new Date(generatedAt.getTime() + REFRESH_COOLDOWN_MS),
      fromCache,
    };
  }
}

module.exports = new JobSuggestionsService();
