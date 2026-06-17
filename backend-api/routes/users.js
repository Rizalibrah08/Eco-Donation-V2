const express = require('express');
const router = express.Router();

// Get user profile
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  db.get('SELECT id, name, email, phone, points, total_kg, total_co2, total_donations_rp, total_setor_count, total_donasi_count FROM users WHERE id = ?',
    [req.params.id], (err, user) => {
      if (!user) return res.status(404).json({ error: 'User not found' });
      // Get badges
      db.all('SELECT name, tier, icon FROM badges WHERE user_id = ?', [req.params.id], (err, badges) => {
        res.json({ ...user, badges: badges || [] });
      });
    });
});

// Get user transactions
router.get('/:id/transactions', (req, res) => {
  const db = req.app.locals.db;
  const limit = req.query.limit || 20;
  db.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [req.params.id, limit], (err, rows) => {
      res.json(rows || []);
    });
});

// Get leaderboard
router.get('/:id/leaderboard', (req, res) => {
  const db = req.app.locals.db;
  db.all('SELECT id, name, points FROM users ORDER BY points DESC LIMIT 5', (err, rows) => {
    res.json(rows || []);
  });
});

// Get distribution stats (waste categories)
router.get('/:id/distribution', (req, res) => {
  const db = req.app.locals.db;
  db.all(`SELECT pi.category, SUM(pi.actual_weight) as total_weight
    FROM pickup_items pi
    JOIN pickup_orders po ON pi.order_id = po.id
    WHERE po.user_id = ? AND po.status = 'completed' AND pi.actual_weight IS NOT NULL
    GROUP BY pi.category`, [req.params.id], (err, rows) => {
      res.json(rows || []);
    });
});

module.exports = router;
