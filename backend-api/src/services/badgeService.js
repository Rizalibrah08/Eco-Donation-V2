const { BADGES, TIER_ORDER, TIER_LABEL } = require('../config/badges');

function tierFor(def, value) {
  let earned = null;
  for (const tier of TIER_ORDER) {
    if (value >= def.tiers[tier]) earned = tier;
  }
  return earned;
}

function createBadgeService({ db, notifier }) {
  return {
    // Status semua lencana untuk ditampilkan di profil.
    list(userId) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      const rows = db.prepare('SELECT name, tier, unlocked_at FROM badges WHERE user_id = ?').all(userId);
      return BADGES.map((def) => {
        const value = user ? user[def.metric] : 0;
        const saved = rows.find((r) => r.name === def.key);
        const tier = saved ? saved.tier : null;
        const nextTier = TIER_ORDER[tier ? TIER_ORDER.indexOf(tier) + 1 : 0] || null;
        const nextTarget = nextTier ? def.tiers[nextTier] : null;
        const prevTarget = tier ? def.tiers[tier] : 0;
        const progress = nextTarget ? Math.max(0, Math.min(1, (value - prevTarget) / (nextTarget - prevTarget))) : 1;
        return {
          key: def.key,
          name: def.name,
          description: def.description,
          icon: def.icon,
          unit: def.unit,
          value: Math.round(value * 100) / 100,
          tier,
          tiers: def.tiers,
          next_tier: nextTier,
          next_target: nextTarget,
          progress,
          unlocked_at: saved ? saved.unlocked_at : null,
        };
      });
    },

    // Membuka/menaikkan lencana sesuai statistik terbaru. Mengembalikan lencana yang berubah.
    evaluate(userId) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) return [];
      const changed = [];
      for (const def of BADGES) {
        const tier = tierFor(def, user[def.metric]);
        if (!tier) continue;
        const saved = db.prepare('SELECT tier FROM badges WHERE user_id = ? AND name = ?').get(userId, def.key);
        if (saved && TIER_ORDER.indexOf(saved.tier) >= TIER_ORDER.indexOf(tier)) continue;
        db.prepare(`INSERT INTO badges (user_id, name, tier, icon) VALUES (?, ?, ?, ?)
                    ON CONFLICT (user_id, name) DO UPDATE SET tier = excluded.tier,
                      unlocked_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`)
          .run(userId, def.key, tier, def.icon);
        changed.push({ key: def.key, name: def.name, tier });
        if (notifier) {
          notifier.notify('user', userId, 'badge:unlocked', {
            title: 'Lencana Baru!',
            message: `Selamat! Anda mendapatkan lencana ${def.name} tingkat ${TIER_LABEL[tier]}.`,
            data: { badge: def.key, tier },
          });
        }
      }
      return changed;
    },
  };
}

module.exports = { createBadgeService };
