/**
 * Utility for retrying async operations with exponential backoff
 */

/**
 * Wait for a specified duration
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in milliseconds for exponential backoff (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if error should trigger retry (default: checks for 429 status)
 * @returns {Promise<any>} - Result of the function
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => {
      // Retry on rate limit errors (429) or network errors
      return (
        error?.response?.status === 429 ||
        error?.status === 429 ||
        error?.code === 'ECONNRESET' ||
        error?.code === 'ETIMEDOUT' ||
        error?.message?.includes('429') ||
        error?.message?.includes('quota') ||
        error?.message?.includes('rate limit')
      );
    },
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error) || attempt === maxRetries - 1) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * exponentialDelay;
      const delay = exponentialDelay + jitter;

      console.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms due to: ${error.message}`
      );

      await wait(delay);
    }
  }

  throw lastError;
}

module.exports = { retryWithBackoff, wait };
