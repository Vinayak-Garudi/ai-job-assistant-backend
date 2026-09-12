/**
 * Regression tests: raw AWS S3 errors must never reach the client.
 *
 * Bug: uploading a resume while the server's IAM key was invalid surfaced
 * "The AWS Access Key Id you provided does not exist in our records." as a
 * toast in the UI, because the raw S3 message was passed straight through the
 * error handler.
 */

// The upload middleware builds multer-s3 storage at require time, which needs
// a bucket name to be present.
process.env.AWS_S3_BUCKET_NAME =
  process.env.AWS_S3_BUCKET_NAME || 'test-bucket';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const multer = require('multer');
const AppError = require('../src/utils/AppError');
const {
  isStorageError,
  isStorageConfigError,
  toSafeStorageError,
  SAFE_MESSAGE,
} = require('../src/utils/storageError');
const { handleMulterError } = require('../src/middleware/upload');

// Build an error shaped like the one @aws-sdk/client-s3 actually throws.
const makeS3Error = (name, message) => {
  const err = new Error(message);
  err.name = name;
  err.$metadata = { httpStatusCode: 403, attempts: 1 };
  return err;
};

const INVALID_KEY_MESSAGE =
  'The AWS Access Key Id you provided does not exist in our records.';

// Run the error through the middleware and capture what next() receives.
const runMiddleware = (err) => {
  let captured;
  handleMulterError(err, {}, {}, (out) => {
    captured = out;
  });
  return captured;
};

describe('storageError helpers', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('recognises credential/config failures as storage errors', () => {
    const cases = [
      'InvalidAccessKeyId',
      'SignatureDoesNotMatch',
      'ExpiredToken',
      'AccessDenied',
      'NoSuchBucket',
    ];

    cases.forEach((name) => {
      const err = makeS3Error(name, 'boom');
      expect(isStorageError(err)).toBe(true);
      expect(isStorageConfigError(err)).toBe(true);
    });
  });

  it('recognises transient failures as storage errors but not config errors', () => {
    const err = makeS3Error('ServiceUnavailable', 'slow down');
    expect(isStorageError(err)).toBe(true);
    expect(isStorageConfigError(err)).toBe(false);
  });

  it('detects an S3 error wrapped by src/config/s3.js via the cause chain', () => {
    const root = makeS3Error('InvalidAccessKeyId', INVALID_KEY_MESSAGE);
    const wrapped = new Error(
      `Failed to generate presigned URL: ${root.message}`,
      { cause: root }
    );

    expect(isStorageError(wrapped)).toBe(true);
    expect(isStorageConfigError(wrapped)).toBe(true);
  });

  it('does not treat ordinary application errors as storage errors', () => {
    expect(isStorageError(new Error('something else broke'))).toBe(false);
    expect(isStorageError(new AppError('Please upload a file', 400))).toBe(
      false
    );
    expect(isStorageError(null)).toBe(false);
    expect(isStorageError(undefined)).toBe(false);
  });

  it('returns a sanitised 503 and logs the real cause for operators', () => {
    const err = makeS3Error('InvalidAccessKeyId', INVALID_KEY_MESSAGE);
    const safe = toSafeStorageError(err, 'Resume upload');

    expect(safe).toBeInstanceOf(AppError);
    expect(safe.statusCode).toBe(503);
    expect(safe.message).toBe(SAFE_MESSAGE);

    // The operator-facing log still contains the true reason.
    const logged = console.error.mock.calls.flat().join(' ');
    expect(logged).toContain('InvalidAccessKeyId');
    expect(logged).toContain('AWS_ACCESS_KEY_ID');
  });
});

describe('handleMulterError', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('never leaks the AWS access-key message to the client', () => {
    const err = makeS3Error('InvalidAccessKeyId', INVALID_KEY_MESSAGE);
    const result = runMiddleware(err);

    expect(result.statusCode).toBe(503);
    expect(result.message).toBe(SAFE_MESSAGE);
    expect(result.message).not.toMatch(/AWS Access Key/i);
    expect(result.message).not.toMatch(/does not exist in our records/i);
  });

  it.each([
    ['LIMIT_FILE_SIZE', 'File size too large. Maximum size is 50MB'],
    ['LIMIT_FILE_COUNT', 'Too many files. Maximum is 10 files'],
    ['LIMIT_UNEXPECTED_FILE', 'Unexpected field in form data'],
  ])('still maps multer %s to a 400', (code, expected) => {
    const result = runMiddleware(new multer.MulterError(code));

    expect(result.statusCode).toBe(400);
    expect(result.message).toBe(expected);
  });

  it('passes non-storage, non-multer errors through untouched', () => {
    const err = new Error('something else broke');
    expect(runMiddleware(err)).toBe(err);
  });

  it('leaves file-type AppErrors from the file filter intact', () => {
    const err = new AppError(
      'Invalid file type. Allowed types: PDF, DOCX',
      400
    );
    const result = runMiddleware(err);

    expect(result).toBe(err);
    expect(result.statusCode).toBe(400);
  });
});
