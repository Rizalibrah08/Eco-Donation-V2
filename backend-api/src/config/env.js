const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const NODE_ENV = process.env.NODE_ENV || 'development';

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (NODE_ENV === 'production') {
    throw new Error('JWT_SECRET wajib diisi saat NODE_ENV=production');
  }
  // Secret khusus development agar sesi tetap valid setelah server restart.
  JWT_SECRET = 'dev-only-insecure-secret-change-me';
  if (NODE_ENV !== 'test') {
    console.warn('[env] JWT_SECRET belum diatur. Memakai secret development (JANGAN dipakai di production).');
  }
}

module.exports = {
  NODE_ENV,
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET,
  JWT_EXPIRES_IN: '7d',
  TOKEN_TTL_MIN: Number(process.env.TOKEN_TTL_MIN) || 30,
  MAX_CODE_ATTEMPTS: 5,
  BCRYPT_COST: Number(process.env.BCRYPT_COST) || 10,
  DB_PATH: process.env.DB_PATH || path.resolve(__dirname, '../../database.sqlite'),
};
