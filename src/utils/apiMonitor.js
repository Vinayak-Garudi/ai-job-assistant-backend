/**
 * API Usage Monitoring Utility
 * Tracks OpenAI API calls and provides usage statistics
 */

class APIMonitor {
  constructor() {
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      cacheHits: 0,
      quotaErrors: 0,
      retries: 0,
      lastError: null,
      lastSuccess: null,
      errors: [],
    };

    // Keep last 50 errors
    this.maxErrors = 50;
  }

  /**
   * Record an API call attempt
   */
  recordCall() {
    this.stats.totalCalls++;
  }

  /**
   * Record a successful API call
   */
  recordSuccess() {
    this.stats.successfulCalls++;
    this.stats.lastSuccess = new Date();
  }

  /**
   * Record a failed API call
   * @param {Error} error - The error that occurred
   */
  recordFailure(error) {
    this.stats.failedCalls++;
    this.stats.lastError = new Date();

    // Track quota-specific errors
    if (
      error.message?.includes('quota') ||
      error.message?.includes('429') ||
      error.status === 429
    ) {
      this.stats.quotaErrors++;
    }

    // Store error details
    const errorEntry = {
      timestamp: new Date(),
      message: error.message,
      status: error.status,
      code: error.code,
    };

    this.stats.errors.unshift(errorEntry);

    // Keep only last N errors
    if (this.stats.errors.length > this.maxErrors) {
      this.stats.errors = this.stats.errors.slice(0, this.maxErrors);
    }
  }

  /**
   * Record a cache hit
   */
  recordCacheHit() {
    this.stats.cacheHits++;
  }

  /**
   * Record a retry attempt
   */
  recordRetry() {
    this.stats.retries++;
  }

  /**
   * Get current statistics
   * @returns {Object} - Current usage statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate:
        this.stats.totalCalls > 0
          ? (
              (this.stats.successfulCalls / this.stats.totalCalls) *
              100
            ).toFixed(2) + '%'
          : '0%',
      cacheHitRate:
        this.stats.totalCalls > 0
          ? ((this.stats.cacheHits / this.stats.totalCalls) * 100).toFixed(2) +
            '%'
          : '0%',
      errorRate:
        this.stats.totalCalls > 0
          ? ((this.stats.failedCalls / this.stats.totalCalls) * 100).toFixed(
              2
            ) + '%'
          : '0%',
    };
  }

  /**
   * Get recent errors
   * @param {number} limit - Number of recent errors to return
   * @returns {Array} - Recent error entries
   */
  getRecentErrors(limit = 10) {
    return this.stats.errors.slice(0, limit);
  }

  /**
   * Check if quota errors are frequent
   * @returns {boolean} - True if quota errors exceed threshold
   */
  isQuotaErrorFrequent() {
    const threshold = 0.3; // 30% of failed calls
    return (
      this.stats.failedCalls > 0 &&
      this.stats.quotaErrors / this.stats.failedCalls > threshold
    );
  }

  /**
   * Get health status
   * @returns {Object} - Health status and recommendations
   */
  getHealth() {
    const successRate =
      this.stats.totalCalls > 0
        ? this.stats.successfulCalls / this.stats.totalCalls
        : 1;

    let status = 'healthy';
    let recommendations = [];

    if (successRate < 0.5) {
      status = 'critical';
      recommendations.push('More than 50% of API calls are failing');
      recommendations.push('Check OpenAI API status and billing');
    } else if (successRate < 0.8) {
      status = 'warning';
      recommendations.push('Success rate is below 80%');
      recommendations.push('Monitor API usage and errors');
    }

    if (this.isQuotaErrorFrequent()) {
      status = status === 'critical' ? 'critical' : 'warning';
      recommendations.push('Frequent quota errors detected');
      recommendations.push('Consider upgrading OpenAI plan or reducing usage');
    }

    if (this.stats.retries > this.stats.successfulCalls * 2) {
      recommendations.push('High retry rate detected');
      recommendations.push('Check network connectivity and API response times');
    }

    return {
      status,
      successRate: (successRate * 100).toFixed(2) + '%',
      recommendations,
      lastError: this.stats.lastError,
      lastSuccess: this.stats.lastSuccess,
    };
  }

  /**
   * Reset all statistics
   */
  reset() {
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      cacheHits: 0,
      quotaErrors: 0,
      retries: 0,
      lastError: null,
      lastSuccess: null,
      errors: [],
    };
  }

  /**
   * Export stats to JSON format
   * @returns {string} - JSON string of statistics
   */
  exportStats() {
    return JSON.stringify(this.getStats(), null, 2);
  }
}

// Create singleton instance
const apiMonitor = new APIMonitor();

module.exports = apiMonitor;
