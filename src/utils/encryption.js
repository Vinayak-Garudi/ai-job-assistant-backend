const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypts a numeric value.
 * Returns a string in the format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a value produced by encrypt().
 * Returns the original number.
 */
function decrypt(encryptedValue) {
  const parts = encryptedValue.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted value format');
  const [ivHex, authTagHex, dataHex] = parts;
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return Number(decrypted.toString('utf8'));
}

/**
 * Returns true if the value looks like an encrypted string (iv:authTag:data).
 */
function isEncrypted(value) {
  return typeof value === 'string' && value.split(':').length === 3;
}

module.exports = { encrypt, decrypt, isEncrypted };
