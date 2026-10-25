const bcrypt = require('bcryptjs');
const { BCRYPT_COST } = require('../config/env');
const { signToken } = require('../middleware/auth');
const { HttpError } = require('../middleware/error');

const USER_FIELDS = `id, name, email, phone, avatar_url, points, total_kg, total_co2, total_donations_rp,
  total_setor_count, total_donasi_count, created_at`;

function createAuthService({ db }) {
  const invalid = () => new HttpError(401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah.');

  return {
    register({ name, email, password, phone }) {
      const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
      if (exists) throw new HttpError(409, 'EMAIL_TAKEN', 'Email sudah terdaftar.');
      const hash = bcrypt.hashSync(password, BCRYPT_COST);
      const info = db
        .prepare('INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)')
        .run(name, email, hash, phone || null);
      const user = db.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).get(info.lastInsertRowid);
      return { user: { ...user, role: 'user' }, token: signToken(user.id, 'user') };
    },

    login({ email, password }) {
      const row = db.prepare(`SELECT ${USER_FIELDS}, password FROM users WHERE email = ?`).get(email);
      if (!row || !bcrypt.compareSync(password, row.password)) throw invalid();
      const { password: _, ...user } = row;
      return { user: { ...user, role: 'user' }, token: signToken(user.id, 'user') };
    },

    courierLogin({ email, password }) {
      const row = db
        .prepare('SELECT id, name, email, phone, is_active, password FROM couriers WHERE email = ?')
        .get(email);
      if (!row || !bcrypt.compareSync(password, row.password)) throw invalid();
      if (!row.is_active) throw new HttpError(403, 'COURIER_INACTIVE', 'Akun kurir Anda tidak aktif.');
      const { password: _, ...courier } = row;
      return { courier: { ...courier, role: 'courier' }, token: signToken(courier.id, 'courier') };
    },
  };
}

module.exports = { createAuthService, USER_FIELDS };
