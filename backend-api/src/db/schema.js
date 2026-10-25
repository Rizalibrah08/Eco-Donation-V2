const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";

// Setiap entri adalah satu versi skema. Tambahkan migrasi baru di akhir array.
const MIGRATIONS = [
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    total_kg REAL NOT NULL DEFAULT 0,
    total_co2 REAL NOT NULL DEFAULT 0,
    total_donations_rp INTEGER NOT NULL DEFAULT 0,
    total_setor_count INTEGER NOT NULL DEFAULT 0,
    total_donasi_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE couriers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE pickup_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    courier_id INTEGER REFERENCES couriers(id),
    status TEXT NOT NULL DEFAULT 'waiting'
      CHECK (status IN ('waiting','on_the_way','arrived','pending_verification','completed','cancelled')),
    pickup_address TEXT NOT NULL,
    pickup_lat REAL NOT NULL,
    pickup_lng REAL NOT NULL,
    scheduled_at TEXT NOT NULL,
    verification_code_hash TEXT,
    code_expires_at TEXT,
    code_attempts INTEGER NOT NULL DEFAULT 0,
    accepted_at TEXT,
    arrived_at TEXT,
    weighed_at TEXT,
    completed_at TEXT,
    cancelled_at TEXT,
    cancelled_by TEXT,
    cancel_reason TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX idx_pickup_user ON pickup_orders(user_id);
  CREATE INDEX idx_pickup_courier ON pickup_orders(courier_id);
  CREATE INDEX idx_pickup_status ON pickup_orders(status);

  CREATE TABLE pickup_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES pickup_orders(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    estimated_weight REAL NOT NULL CHECK (estimated_weight > 0),
    actual_weight REAL
  );
  CREATE INDEX idx_items_order ON pickup_items(order_id);

  CREATE TABLE campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL DEFAULT 'local' CHECK (source IN ('local','everyorg')),
    external_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Lainnya',
    organizer TEXT,
    target_amount INTEGER,
    collected_amount INTEGER NOT NULL DEFAULT 0,
    donor_count INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    location TEXT,
    deadline TEXT,
    is_urgent INTEGER NOT NULL DEFAULT 0,
    updates TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT ${NOW},
    UNIQUE (source, external_id)
  );

  CREATE TABLE donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
    points_spent INTEGER NOT NULL CHECK (points_spent > 0),
    rupiah_value INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX idx_donations_campaign ON donations(campaign_id);
  CREATE INDEX idx_donations_user ON donations(user_id);

  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK (type IN ('setor','donasi')),
    title TEXT NOT NULL,
    description TEXT,
    points INTEGER NOT NULL,
    ref_type TEXT,
    ref_id INTEGER,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX idx_trx_user ON transactions(user_id, created_at);

  CREATE TABLE badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'bronze',
    icon TEXT,
    unlocked_at TEXT NOT NULL DEFAULT ${NOW},
    UNIQUE (user_id, name)
  );

  CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_role TEXT NOT NULL CHECK (recipient_role IN ('user','courier')),
    recipient_id INTEGER NOT NULL,
    order_id INTEGER,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX idx_notif_recipient ON notifications(recipient_role, recipient_id, is_read);
  `,
  // v2: live tracking kurir
  `
  ALTER TABLE pickup_orders ADD COLUMN courier_lat REAL;
  ALTER TABLE pickup_orders ADD COLUMN courier_lng REAL;
  ALTER TABLE pickup_orders ADD COLUMN courier_location_at TEXT;
  ALTER TABLE pickup_orders ADD COLUMN near_notified INTEGER NOT NULL DEFAULT 0;
  `,
];

function migrate(db) {
  const hasVersionTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
    .get();

  if (!hasVersionTable) {
    const legacy = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (legacy) {
      throw new Error('Database versi lama terdeteksi. Jalankan "npm run seed" untuk membuat ulang database.');
    }
    db.exec('CREATE TABLE schema_version (version INTEGER NOT NULL)');
    db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
  }

  const current = db.prepare('SELECT version FROM schema_version').get().version;
  const apply = db.transaction(() => {
    for (let v = current; v < MIGRATIONS.length; v++) {
      db.exec(MIGRATIONS[v]);
    }
    db.prepare('UPDATE schema_version SET version = ?').run(MIGRATIONS.length);
  });
  apply();
}

module.exports = { migrate, MIGRATIONS };
