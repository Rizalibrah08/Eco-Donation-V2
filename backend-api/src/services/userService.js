const bcrypt = require('bcryptjs');
const { BCRYPT_COST } = require('../config/env');
const { HttpError } = require('../middleware/error');
const { USER_FIELDS } = require('./authService');

function createUserService({ db, badges }) {
  const getUser = (id) => {
    const user = db.prepare(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`).get(id);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'Pengguna tidak ditemukan.');
    return user;
  };

  return {
    me(id) {
      const user = getUser(id);
      return { ...user, role: 'user', badges: badges.list(id) };
    },

    update(id, { name, phone }) {
      const fields = [];
      const params = [];
      if (name !== undefined) { fields.push('name = ?'); params.push(name); }
      if (phone !== undefined) { fields.push('phone = ?'); params.push(phone || null); }
      if (fields.length) {
        db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
      }
      return this.me(id);
    },

    changePassword(id, { current_password, new_password }) {
      const row = db.prepare('SELECT password FROM users WHERE id = ?').get(id);
      if (!row || !bcrypt.compareSync(current_password, row.password)) {
        throw new HttpError(400, 'WRONG_PASSWORD', 'Kata sandi saat ini salah.');
      }
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(new_password, BCRYPT_COST), id);
    },

    transactions(id, { limit, offset }) {
      return db
        .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?')
        .all(id, limit, offset);
    },

    distribution(id) {
      return db
        .prepare(`SELECT pi.category, ROUND(SUM(pi.actual_weight), 2) AS total_weight
                  FROM pickup_items pi JOIN pickup_orders po ON pi.order_id = po.id
                  WHERE po.user_id = ? AND po.status = 'completed' AND pi.actual_weight IS NOT NULL
                  GROUP BY pi.category ORDER BY total_weight DESC`)
        .all(id);
    },

    leaderboard(auth, limit) {
      const entries = db
        .prepare(`SELECT id, name, points, total_kg FROM users ORDER BY points DESC, id ASC LIMIT ?`)
        .all(limit)
        .map((row, i) => ({ rank: i + 1, ...row }));
      let me = null;
      if (auth.role === 'user') {
        const user = db.prepare('SELECT id, points FROM users WHERE id = ?').get(auth.id);
        if (user) {
          const { ahead } = db
            .prepare('SELECT COUNT(*) AS ahead FROM users WHERE points > ? OR (points = ? AND id < ?)')
            .get(user.points, user.points, user.id);
          me = { rank: ahead + 1, points: user.points };
        }
      }
      return { entries, me };
    },

    courierMe(id) {
      const courier = db
        .prepare('SELECT id, name, email, phone, is_active, created_at FROM couriers WHERE id = ?')
        .get(id);
      if (!courier) throw new HttpError(404, 'COURIER_NOT_FOUND', 'Kurir tidak ditemukan.');
      const stats = db
        .prepare(`SELECT COUNT(*) AS completed_count,
                    COALESCE((SELECT ROUND(SUM(pi.actual_weight), 2) FROM pickup_items pi
                      JOIN pickup_orders p2 ON p2.id = pi.order_id
                      WHERE p2.courier_id = ? AND p2.status = 'completed'), 0) AS total_kg
                  FROM pickup_orders WHERE courier_id = ? AND status = 'completed'`)
        .get(id, id);
      return { ...courier, role: 'courier', ...stats };
    },
  };
}

module.exports = { createUserService };
