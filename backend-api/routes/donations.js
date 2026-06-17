const express = require('express');
const router = express.Router();

// Create donation
router.post('/', (req, res) => {
  const { user_id, campaign_id, points } = req.body;
  if (!user_id || !campaign_id || !points) return res.status(400).json({ error: 'user_id, campaign_id, points required' });

  const db = req.app.locals.db;
  // Check balance
  db.get('SELECT points FROM users WHERE id = ?', [user_id], (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.points < points) return res.status(400).json({ error: 'Insufficient balance' });

    const rupiah = points; // 1 point = Rp 1

    db.serialize(() => {
      // Deduct points
      db.run('UPDATE users SET points = points - ?, total_donations_rp = total_donations_rp + ?, total_donasi_count = total_donasi_count + 1 WHERE id = ?',
        [points, rupiah, user_id]);
      // Update campaign
      db.run('UPDATE campaigns SET collected_amount = collected_amount + ?, donor_count = donor_count + 1 WHERE id = ?',
        [rupiah, campaign_id]);
      // Record donation
      db.run('INSERT INTO donations (user_id, campaign_id, points_spent, rupiah_value) VALUES (?, ?, ?, ?)',
        [user_id, campaign_id, points, rupiah]);
      // Get campaign name for transaction
      db.get('SELECT title FROM campaigns WHERE id = ?', [campaign_id], (err, campaign) => {
        // Record transaction
        db.run('INSERT INTO transactions (user_id, type, title, description, points) VALUES (?, ?, ?, ?, ?)',
          [user_id, 'donasi', `Donasi ke ${campaign?.title || 'Campaign'}`, campaign?.title, -points]);
        res.json({ success: true, remaining_points: user.points - points });
      });
    });
  });
});

module.exports = router;
