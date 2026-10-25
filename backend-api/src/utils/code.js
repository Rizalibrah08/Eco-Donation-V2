const crypto = require('crypto');

// Tanpa karakter yang mudah tertukar (O/0, I/1).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

function normalizeCode(code) {
  return String(code).trim().toUpperCase();
}

function hashCode(code) {
  return crypto.createHash('sha256').update(normalizeCode(code)).digest('hex');
}

function codesMatch(code, hash) {
  if (!hash) return false;
  const a = Buffer.from(hashCode(code), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { ALPHABET, generateCode, hashCode, codesMatch, normalizeCode };
