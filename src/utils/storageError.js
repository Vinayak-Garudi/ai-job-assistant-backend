const AppError = require('./AppError');

/**
 * Helpers for turning raw AWS S3 failures into safe, user-facing errors.
 *
 * AWS messages such as "The AWS Access Key Id you provided does not exist in
 * our records" describe a server misconfiguration. They must never be sent to
 * the client: they are meaningless to the end user and leak infrastructure
 * detail. Operators get the real cause via the server log instead.
 */

// Credential / permission / bucket problems — the deployment is misconfigured.
const STORAGE_CONFIG_ERRORS = new Set([
  'InvalidAccessKeyId',
  'SignatureDoesNotMatch',
  'InvalidSecurity',
  'InvalidSecurityToken',
  'InvalidToken',
  'ExpiredToken',
  'ExpiredTokenException',
  'TokenRefreshRequired',
  'AccessDenied',
  'AccessDeniedException',
  'NoSuchBucket',
  'PermanentRedirect',
  'AuthorizationHeaderMalformed',
  'CredentialsError',
  'CredentialsProviderError',
  'ConfigError',
]);

// Temporary problems — retrying later may succeed.
const STORAGE_TRANSIENT_ERRORS = new Set([
  'NetworkingError',
  'TimeoutError',
  'RequestTimeout',
  'RequestTimeTooSkewed',
  'ServiceUnavailable',
  'SlowDown',
  'InternalError',
]);

const SAFE_MESSAGE =
  'File storage is temporarily unavailable. Please try again in a few minutes.';

// Built-in error names carry no information about the failure, so they must not
// stop the walk down the `cause` chain.
const GENERIC_ERROR_NAMES = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'ReferenceError',
  'EvalError',
  'URIError',
  'AggregateError',
]);

// Guard against a malformed or self-referencing `cause` chain.
const MAX_CAUSE_DEPTH = 5;

// The code carried by this error itself, across aws-sdk v2 (`code`) and
// v3 (`name` / `Code`). Returns null for generic JS error names.
const ownErrorCode = (err) => {
  const code = err.name || err.Code || err.code;
  return code && !GENERIC_ERROR_NAMES.has(code) ? code : null;
};

/**
 * Normalise the error code, walking the `cause` chain so errors re-thrown by
 * `src/config/s3.js` (which wrap the AWS error in a plain `Error`) are still
 * recognised.
 */
const getStorageErrorCode = (err, depth = 0) => {
  if (!err || depth > MAX_CAUSE_DEPTH) return null;
  return ownErrorCode(err) || getStorageErrorCode(err.cause, depth + 1);
};

// AWS SDK v3 attaches $metadata to every service error.
const hasAwsMetadata = (err, depth = 0) => {
  if (!err || depth > MAX_CAUSE_DEPTH) return false;
  return Boolean(err.$metadata) || hasAwsMetadata(err.cause, depth + 1);
};

/** True when the error originated from S3 rather than from user input. */
const isStorageError = (err) => {
  if (!err) return false;
  const code = getStorageErrorCode(err);
  return (
    STORAGE_CONFIG_ERRORS.has(code) ||
    STORAGE_TRANSIENT_ERRORS.has(code) ||
    hasAwsMetadata(err)
  );
};

const isStorageConfigError = (err) =>
  STORAGE_CONFIG_ERRORS.has(getStorageErrorCode(err));

/**
 * Log the true cause for operators and return a sanitised AppError (503) that
 * is safe to send to the client.
 */
const toSafeStorageError = (err, context = 'S3 operation') => {
  const code = getStorageErrorCode(err) || 'UnknownError';

  console.error(`❌ ${context} failed [${code}]: ${err?.message}`);

  if (isStorageConfigError(err)) {
    console.error(
      '   → The AWS credentials on this server are invalid, expired, or lack ' +
        'the required S3 permission on the configured bucket. Verify ' +
        'AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION and ' +
        'AWS_S3_BUCKET_NAME in the active .env file.'
    );
  }

  return new AppError(SAFE_MESSAGE, 503);
};

module.exports = {
  STORAGE_CONFIG_ERRORS,
  STORAGE_TRANSIENT_ERRORS,
  SAFE_MESSAGE,
  getStorageErrorCode,
  isStorageError,
  isStorageConfigError,
  toSafeStorageError,
};
