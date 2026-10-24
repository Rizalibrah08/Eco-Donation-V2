// Menyimpan notifikasi ke DB dan meneruskannya ke room Socket.io.
// `emitter` adalah objek { emit(room, event, payload) } sehingga mudah diganti saat test.
function createNotificationService(db, emitter = { emit() {} }) {
  let out = emitter;

  const insert = db.prepare(`
    INSERT INTO notifications (recipient_role, recipient_id, order_id, type, title, message, data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const getById = db.prepare('SELECT * FROM notifications WHERE id = ?');

  function serialize(row) {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      order_id: row.order_id,
      data: row.data ? JSON.parse(row.data) : null,
      is_read: !!row.is_read,
      created_at: row.created_at,
    };
  }

  return {
    setEmitter(next) {
      out = next;
    },

    // Kirim ke satu penerima (disimpan di riwayat notifikasi).
    notify(role, recipientId, event, { orderId = null, title, message, data = {} }) {
      const info = insert.run(role, recipientId, orderId, event, title, message, JSON.stringify(data));
      const notification = serialize(getById.get(info.lastInsertRowid));
      out.emit(`${role}:${recipientId}`, event, { orderId, ...data, notification });
      return notification;
    },

    // Event sesaat ke satu penerima tanpa disimpan (mis. lokasi kurir).
    emitTo(role, recipientId, event, payload) {
      out.emit(`${role}:${recipientId}`, event, payload);
    },

    // Broadcast ke semua kurir (tidak disimpan).
    broadcastCouriers(event, payload) {
      out.emit('couriers', event, payload);
    },

    list(role, recipientId, limit = 30) {
      const rows = db
        .prepare(`SELECT * FROM notifications WHERE recipient_role = ? AND recipient_id = ?
                  ORDER BY id DESC LIMIT ?`)
        .all(role, recipientId, limit);
      const { count } = db
        .prepare(`SELECT COUNT(*) AS count FROM notifications
                  WHERE recipient_role = ? AND recipient_id = ? AND is_read = 0`)
        .get(role, recipientId);
      return { items: rows.map(serialize), unread_count: count };
    },

    markRead(role, recipientId, ids) {
      if (ids && ids.length) {
        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`UPDATE notifications SET is_read = 1
                    WHERE recipient_role = ? AND recipient_id = ? AND id IN (${placeholders})`)
          .run(role, recipientId, ...ids);
      } else {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_role = ? AND recipient_id = ?')
          .run(role, recipientId);
      }
    },
  };
}

module.exports = { createNotificationService };
