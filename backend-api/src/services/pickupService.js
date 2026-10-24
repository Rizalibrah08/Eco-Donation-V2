const { TOKEN_TTL_MIN, MAX_CODE_ATTEMPTS } = require('../config/env');
const { calculate } = require('../config/rates');
const { HttpError } = require('../middleware/error');
const { generateCode, hashCode, codesMatch } = require('../utils/code');

const notFound = () => new HttpError(404, 'ORDER_NOT_FOUND', 'Order penjemputan tidak ditemukan.');
const invalidStatus = (message = 'Aksi ini tidak dapat dilakukan pada status order saat ini.') =>
  new HttpError(409, 'INVALID_STATUS', message);

const HIDDEN = ['verification_code_hash', 'code_attempts'];

function createPickupService({ db, notifier, now = () => new Date(), hooks = {} }) {
  const iso = () => now().toISOString();

  const selectOrder = db.prepare(`
    SELECT po.*, u.name AS user_name, u.phone AS user_phone, c.name AS courier_name, c.phone AS courier_phone
    FROM pickup_orders po
    JOIN users u ON u.id = po.user_id
    LEFT JOIN couriers c ON c.id = po.courier_id
    WHERE po.id = ?`);
  const selectItems = db.prepare('SELECT * FROM pickup_items WHERE order_id = ? ORDER BY id');

  function serialize(order, items) {
    const out = { ...order, items: items || selectItems.all(order.id) };
    for (const key of HIDDEN) delete out[key];
    return out;
  }

  function attachItems(orders) {
    if (!orders.length) return [];
    const ids = orders.map((o) => o.id);
    const rows = db
      .prepare(`SELECT * FROM pickup_items WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`)
      .all(...ids);
    return orders.map((o) => serialize(o, rows.filter((r) => r.order_id === o.id)));
  }

  function load(id) {
    const order = selectOrder.get(id);
    if (!order) throw notFound();
    return order;
  }

  function loadOwned(id, userId) {
    const order = load(id);
    if (order.user_id !== userId) throw notFound();
    return order;
  }

  function loadAssigned(id, courierId) {
    const order = load(id);
    if (order.courier_id !== courierId) throw notFound();
    return order;
  }

  function issueCode(orderId) {
    const code = generateCode();
    const expiresAt = new Date(now().getTime() + TOKEN_TTL_MIN * 60 * 1000).toISOString();
    db.prepare(`UPDATE pickup_orders SET verification_code_hash = ?, code_expires_at = ?, code_attempts = 0
                WHERE id = ?`).run(hashCode(code), expiresAt, orderId);
    return {
      code,
      qr_payload: `ecodonation://verify?order=${orderId}&code=${code}`,
      expires_at: expiresAt,
    };
  }

  function summary(order) {
    const items = selectItems.all(order.id);
    const result = calculate(
      items.map((i) => ({ id: i.id, category: i.category, weight: i.actual_weight ?? i.estimated_weight })),
    );
    return {
      items: items.map((i, idx) => ({
        id: i.id,
        category: i.category,
        estimated_weight: i.estimated_weight,
        actual_weight: i.actual_weight,
        points: result.lines[idx].points,
      })),
      total_points: result.total_points,
      total_kg: result.total_kg,
      co2: result.co2,
    };
  }

  return {
    create(userId, { items, pickup_address, pickup_lat, pickup_lng, scheduled_at }) {
      const orderId = db.transaction(() => {
        const info = db
          .prepare(`INSERT INTO pickup_orders (user_id, pickup_address, pickup_lat, pickup_lng, scheduled_at, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)`)
          .run(userId, pickup_address, pickup_lat, pickup_lng, scheduled_at, iso());
        const insertItem = db.prepare(
          'INSERT INTO pickup_items (order_id, category, estimated_weight) VALUES (?, ?, ?)',
        );
        for (const item of items) insertItem.run(info.lastInsertRowid, item.category, item.estimated_weight);
        return info.lastInsertRowid;
      })();

      const order = serialize(load(orderId));
      notifier.broadcastCouriers('order:new', { orderId, order });
      return order;
    },

    listForUser(userId, status) {
      const params = [userId];
      let sql = `SELECT po.*, u.name AS user_name, c.name AS courier_name, c.phone AS courier_phone
                 FROM pickup_orders po JOIN users u ON u.id = po.user_id
                 LEFT JOIN couriers c ON c.id = po.courier_id WHERE po.user_id = ?`;
      if (status) { sql += ' AND po.status = ?'; params.push(status); }
      sql += ' ORDER BY po.created_at DESC, po.id DESC';
      return attachItems(db.prepare(sql).all(...params));
    },

    getForActor(id, auth) {
      const order = load(id);
      const allowed =
        (auth.role === 'user' && order.user_id === auth.id) ||
        (auth.role === 'courier' &&
          (order.courier_id === auth.id || (order.status === 'waiting' && order.courier_id === null)));
      if (!allowed) throw notFound();
      return serialize(order);
    },

    courierTasks(courierId, scope) {
      const base = `SELECT po.*, u.name AS user_name, u.phone AS user_phone FROM pickup_orders po
                    JOIN users u ON u.id = po.user_id`;
      const rows =
        scope === 'available'
          ? db.prepare(`${base} WHERE po.status = 'waiting' AND po.courier_id IS NULL
                        ORDER BY po.scheduled_at ASC, po.id ASC`).all()
          : db.prepare(`${base} WHERE po.courier_id = ? AND po.status NOT IN ('completed','cancelled')
                        ORDER BY po.accepted_at DESC, po.id DESC`).all(courierId);
      return attachItems(rows);
    },

    courierHistory(courierId, limit) {
      const rows = db
        .prepare(`SELECT po.*, u.name AS user_name FROM pickup_orders po JOIN users u ON u.id = po.user_id
                  WHERE po.courier_id = ? AND po.status = 'completed'
                  ORDER BY po.completed_at DESC LIMIT ?`)
        .all(courierId, limit);
      return attachItems(rows);
    },

    accept(id, courierId) {
      const result = db
        .prepare(`UPDATE pickup_orders SET status = 'on_the_way', courier_id = ?, accepted_at = ?
                  WHERE id = ? AND status = 'waiting' AND courier_id IS NULL`)
        .run(courierId, iso(), id);
      if (result.changes === 0) {
        load(id);
        throw new HttpError(409, 'ALREADY_TAKEN', 'Order ini sudah diambil kurir lain atau tidak tersedia lagi.');
      }
      const order = load(id);
      notifier.broadcastCouriers('order:taken', { orderId: id });
      notifier.notify('user', order.user_id, 'order:accepted', {
        orderId: id,
        title: 'Kurir Ditemukan',
        message: `${order.courier_name} menerima permintaan Anda dan sedang menuju lokasi.`,
        data: { courierName: order.courier_name },
      });
      return serialize(order);
    },

    arrive(id, courierId) {
      const order = loadAssigned(id, courierId);
      if (order.status !== 'on_the_way') throw invalidStatus();
      db.prepare(`UPDATE pickup_orders SET status = 'arrived', arrived_at = ? WHERE id = ?`).run(iso(), id);
      notifier.notify('user', order.user_id, 'order:arrived', {
        orderId: id,
        title: 'Kurir Telah Tiba',
        message: 'Kurir sudah sampai di lokasi Anda. Siapkan sampah untuk ditimbang.',
      });
      return serialize(load(id));
    },

    weigh(id, courierId, items) {
      const order = loadAssigned(id, courierId);
      if (!['arrived', 'pending_verification'].includes(order.status)) throw invalidStatus();

      const orderItems = selectItems.all(id);
      const ids = new Set(items.map((i) => i.id));
      const valid =
        ids.size === items.length &&
        items.length === orderItems.length &&
        orderItems.every((oi) => ids.has(oi.id));
      if (!valid) {
        throw new HttpError(400, 'INVALID_ITEMS', 'Berat aktual harus diisi untuk semua barang pada order ini.');
      }

      const issued = db.transaction(() => {
        const update = db.prepare('UPDATE pickup_items SET actual_weight = ? WHERE id = ? AND order_id = ?');
        for (const item of items) update.run(item.actual_weight, item.id, id);
        db.prepare(`UPDATE pickup_orders SET status = 'pending_verification', weighed_at = ? WHERE id = ?`)
          .run(iso(), id);
        return issueCode(id);
      })();

      const sum = summary(load(id));
      notifier.notify('user', order.user_id, 'order:weighed', {
        orderId: id,
        title: 'Sampah Sudah Ditimbang',
        message: `Total ${sum.total_kg} kg (+${sum.total_points.toLocaleString('id-ID')} poin). Pindai QR kurir untuk menyetujui.`,
        data: { totalPoints: sum.total_points, totalKg: sum.total_kg },
      });
      return issued;
    },

    regenerateCode(id, courierId) {
      const order = loadAssigned(id, courierId);
      if (order.status !== 'pending_verification') throw invalidStatus();
      return issueCode(id);
    },

    verification(id, userId) {
      const order = loadOwned(id, userId);
      if (order.status !== 'pending_verification') throw invalidStatus('Order ini tidak sedang menunggu verifikasi.');
      return { order_id: id, courier_name: order.courier_name, expires_at: order.code_expires_at, ...summary(order) };
    },

    approve(id, userId, code) {
      const order = loadOwned(id, userId);
      if (order.status !== 'pending_verification') throw invalidStatus('Order ini tidak sedang menunggu verifikasi.');
      if (!order.verification_code_hash) {
        throw new HttpError(423, 'CODE_LOCKED', 'Kode verifikasi diblokir. Minta kurir membuat kode baru.');
      }
      if (new Date(order.code_expires_at) < now()) {
        throw new HttpError(410, 'CODE_EXPIRED', 'Kode verifikasi sudah kedaluwarsa. Minta kurir membuat kode baru.');
      }
      if (!codesMatch(code, order.verification_code_hash)) {
        const attempts = order.code_attempts + 1;
        if (attempts >= MAX_CODE_ATTEMPTS) {
          db.prepare(`UPDATE pickup_orders SET verification_code_hash = NULL, code_attempts = ? WHERE id = ?`)
            .run(attempts, id);
          throw new HttpError(423, 'CODE_LOCKED', 'Terlalu banyak percobaan salah. Minta kurir membuat kode baru.');
        }
        db.prepare('UPDATE pickup_orders SET code_attempts = ? WHERE id = ?').run(attempts, id);
        throw new HttpError(400, 'INVALID_CODE', 'Kode verifikasi tidak cocok.', {
          remaining_attempts: MAX_CODE_ATTEMPTS - attempts,
        });
      }

      const sum = summary(order);
      const balance = db.transaction(() => {
        const done = db
          .prepare(`UPDATE pickup_orders SET status = 'completed', completed_at = ?, verification_code_hash = NULL
                    WHERE id = ? AND status = 'pending_verification'`)
          .run(iso(), id);
        if (done.changes === 0) throw invalidStatus('Order ini sudah diverifikasi.');

        db.prepare(`UPDATE users SET points = points + ?, total_kg = total_kg + ?, total_co2 = total_co2 + ?,
                      total_setor_count = total_setor_count + 1 WHERE id = ?`)
          .run(sum.total_points, sum.total_kg, sum.co2, userId);
        const description = sum.items.map((i) => `${i.category} ${i.actual_weight} kg`).join(', ');
        db.prepare(`INSERT INTO transactions (user_id, type, title, description, points, ref_type, ref_id, created_at)
                    VALUES (?, 'setor', ?, ?, ?, 'pickup', ?, ?)`)
          .run(userId, `Setor Sampah #${id}`, description, sum.total_points, id, iso());
        if (hooks.onPickupCompleted) hooks.onPickupCompleted(userId);
        return db.prepare('SELECT points FROM users WHERE id = ?').get(userId).points;
      })();

      notifier.notify('user', userId, 'order:completed', {
        orderId: id,
        title: 'Poin Berhasil Ditambahkan',
        message: `Terima kasih! +${sum.total_points.toLocaleString('id-ID')} poin telah masuk ke saldo Anda.`,
        data: { pointsEarned: sum.total_points },
      });
      notifier.notify('courier', order.courier_id, 'order:completed', {
        orderId: id,
        title: 'Verifikasi Berhasil',
        message: `${order.user_name} telah menyetujui hasil timbangan order #${id}.`,
        data: { pointsEarned: sum.total_points },
      });

      return { points_earned: sum.total_points, total_kg: sum.total_kg, co2: sum.co2, balance };
    },

    reject(id, userId, reason) {
      const order = loadOwned(id, userId);
      if (order.status !== 'pending_verification') throw invalidStatus('Order ini tidak sedang menunggu verifikasi.');
      db.prepare(`UPDATE pickup_orders SET status = 'arrived', verification_code_hash = NULL, code_expires_at = NULL,
                    code_attempts = 0 WHERE id = ?`).run(id);
      notifier.notify('courier', order.courier_id, 'order:rejected', {
        orderId: id,
        title: 'Hasil Timbangan Ditolak',
        message: reason
          ? `${order.user_name} menolak hasil timbangan: "${reason}". Silakan timbang ulang.`
          : `${order.user_name} menolak hasil timbangan. Silakan timbang ulang bersama pengguna.`,
        data: { reason: reason || null },
      });
      return serialize(load(id));
    },

    cancel(id, auth, reason) {
      const order = load(id);

      if (auth.role === 'user') {
        if (order.user_id !== auth.id) throw notFound();
        if (!['waiting', 'on_the_way'].includes(order.status)) {
          throw invalidStatus('Order tidak dapat dibatalkan karena kurir sudah tiba atau order sudah selesai.');
        }
        db.prepare(`UPDATE pickup_orders SET status = 'cancelled', cancelled_at = ?, cancelled_by = 'user',
                      cancel_reason = ? WHERE id = ?`).run(iso(), reason || null, id);
        if (order.courier_id) {
          notifier.notify('courier', order.courier_id, 'order:cancelled', {
            orderId: id,
            title: 'Order Dibatalkan',
            message: `${order.user_name} membatalkan order #${id}.`,
          });
        } else {
          notifier.broadcastCouriers('order:taken', { orderId: id });
        }
        return serialize(load(id));
      }

      if (order.courier_id !== auth.id) throw notFound();
      if (!['on_the_way', 'arrived'].includes(order.status)) throw invalidStatus();
      db.prepare(`UPDATE pickup_orders SET status = 'waiting', courier_id = NULL, accepted_at = NULL, arrived_at = NULL
                  WHERE id = ?`).run(id);
      notifier.notify('user', order.user_id, 'order:cancelled', {
        orderId: id,
        title: 'Mencari Kurir Lain',
        message: 'Kurir sebelumnya berhalangan. Kami sedang mencarikan kurir lain untuk Anda.',
      });
      const updated = serialize(load(id));
      notifier.broadcastCouriers('order:new', { orderId: id, order: updated });
      return updated;
    },
  };
}

module.exports = { createPickupService };
