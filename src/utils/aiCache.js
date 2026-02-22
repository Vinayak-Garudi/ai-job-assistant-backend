const crypto = require('crypto');

/**
 * Simple in-memory cache for AI responses
 * For production, consider using Redis or a similar persistent cache
 */
class AICache {
  constructor(ttl = 3600000) {
    // Default TTL: 1 hour
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Generate a cache key from user profile and job details
   * @param {Object} userProfile - User profile object
   * @param {Object} jobDetails - Job details object
   * @returns {string} - Cache key
   */
  generateKey(userProfile, jobDetails) {
    // Create a deterministic key based on relevant fields
    const userKey = {
      skills: userProfile.otherInfo?.skills || [],
      experience: userProfile.professionalInfo?.experienceYears || 0,
      currentTitle: userProfile.professionalInfo?.currentTitle || '',
      education: userProfile.otherInfo?.education || [],
    };

    const jobKey = {
      title: jobDetails.jobTitle || '',
      description: jobDetails.jobDescription || '',
      requirements: jobDetails.requirements || '',
      company: jobDetails.company || '',
    };

    const combined = JSON.stringify({ user: userKey, job: jobKey });

    // Create hash of the combined data
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Get cached analysis
   * @param {string} key - Cache key
   * @returns {Object|null} - Cached analysis or null if not found/expired
   */
  get(key) {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    console.log('Cache hit for AI analysis');
    return cached.data;
  }

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, data, ttl = this.ttl) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   * @returns {Object} - Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
    };
  }
}

// Create singleton instance
const aiCache = new AICache();

// Clear expired entries every 10 minutes
setInterval(
  () => {
    aiCache.clearExpired();
  },
  10 * 60 * 1000
);

module.exports = aiCache;
