const { POINT_TO_RUPIAH } = require('../config/rates');
const { HttpError } = require('../middleware/error');

const notFound = () => new HttpError(404, 'CAMPAIGN_NOT_FOUND', 'Kampanye tidak ditemukan.');

function parse(row) {
  return { ...row, updates: JSON.parse(row.updates || '[]') };
}

function createCampaignService({ db, now = () => new Date() }) {
  const iso = () => now().toISOString();

  function stats(campaignId) {
    const row = db
      .prepare(`SELECT COALESCE(SUM(points_spent), 0) AS collected_points, COUNT(DISTINCT user_id) AS donor_count
                FROM donations WHERE campaign_id = ?`)
      .get(campaignId);
    return row;
  }

  return {
    list({ category, search }) {
      const params = [];
      let sql = "SELECT * FROM campaigns WHERE source = 'local'";
      if (category) { sql += ' AND category = ?'; params.push(category); }
      if (search) { sql += ' AND (title LIKE ? OR organizer LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
      sql += ' ORDER BY is_urgent DESC, created_at DESC, id DESC';
      return db.prepare(sql).all(...params).map(parse);
    },

    get(id) {
      const row = db.prepare("SELECT * FROM campaigns WHERE id = ? AND source = 'local'").get(id);
      if (!row) throw notFound();
      return parse(row);
    },

    stats(id) {
      const row = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(id);
      if (!row) throw notFound();
      return stats(id);
    },

    externalStats(source, externalId) {
      const row = db.prepare('SELECT id FROM campaigns WHERE source = ? AND external_id = ?').get(source, externalId);
      if (!row) return { collected_points: 0, donor_count: 0 };
      return stats(row.id);
    },

    // Seluruh langkah donasi dalam satu transaksi: gagal di tengah → rollback.
    donate(userId, body) {
      return db.transaction(() => {
        let campaign;
        if (body.source === 'everyorg') {
          db.prepare(`INSERT INTO campaigns (source, external_id, title, image_url, category, organizer)
                      VALUES ('everyorg', ?, ?, ?, 'Global', 'Every.org')
                      ON CONFLICT (source, external_id) DO UPDATE SET title = excluded.title,
                        image_url = COALESCE(excluded.image_url, campaigns.image_url)`)
            .run(body.external_id, body.title, body.image_url || null);
          campaign = db
            .prepare("SELECT * FROM campaigns WHERE source = 'everyorg' AND external_id = ?")
            .get(body.external_id);
        } else {
          campaign = db.prepare("SELECT * FROM campaigns WHERE id = ? AND source = 'local'").get(body.campaign_id);
          if (!campaign) throw notFound();
        }

        const points = body.points;
        const rupiah = points * POINT_TO_RUPIAH;
        const paid = db
          .prepare(`UPDATE users SET points = points - ?, total_donations_rp = total_donations_rp + ?,
                      total_donasi_count = total_donasi_count + 1 WHERE id = ? AND points >= ?`)
          .run(points, rupiah, userId, points);
        if (paid.changes === 0) throw new HttpError(400, 'INSUFFICIENT_POINTS', 'Saldo poin Anda tidak cukup.');

        const firstTime = !db
          .prepare('SELECT 1 FROM donations WHERE user_id = ? AND campaign_id = ?')
          .get(userId, campaign.id);
        db.prepare('UPDATE campaigns SET collected_amount = collected_amount + ?, donor_count = donor_count + ? WHERE id = ?')
          .run(rupiah, firstTime ? 1 : 0, campaign.id);

        const donation = db
          .prepare('INSERT INTO donations (user_id, campaign_id, points_spent, rupiah_value, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(userId, campaign.id, points, rupiah, iso());
        db.prepare(`INSERT INTO transactions (user_id, type, title, description, points, ref_type, ref_id, created_at)
                    VALUES (?, 'donasi', ?, ?, ?, 'donation', ?, ?)`)
          .run(userId, `Donasi ke ${campaign.title}`, campaign.organizer || campaign.title, -points,
            donation.lastInsertRowid, iso());

        const balance = db.prepare('SELECT points FROM users WHERE id = ?').get(userId).points;
        return { donation_id: donation.lastInsertRowid, campaign_id: campaign.id, balance };
      })();
    },
  };
}

module.exports = { createCampaignService };
