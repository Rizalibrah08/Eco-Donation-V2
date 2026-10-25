const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const { HttpError } = require('./error');

function signToken(id, role) {
  return jwt.sign({ sub: String(id), role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Mengembalikan { id, role } atau melempar error bila token tidak valid.
function verifyToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  const id = Number(payload.sub);
  if (!Number.isInteger(id) || !['user', 'courier'].includes(payload.role)) {
    throw new Error('Invalid token payload');
  }
  return { id, role: payload.role };
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Silakan masuk terlebih dahulu.'));
  }
  try {
    req.auth = verifyToken(header.slice(7));
    next();
  } catch {
    next(new HttpError(401, 'UNAUTHORIZED', 'Sesi Anda telah berakhir, silakan masuk kembali.'));
  }
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) {
    return next(new HttpError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke fitur ini.'));
  }
  next();
};

module.exports = { signToken, verifyToken, authenticate, requireRole };
