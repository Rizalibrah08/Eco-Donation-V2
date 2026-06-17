const express = require('express');
const router = express.Router();

// List campaigns with optional category filter
router.get('/', (req, res) => {
  const { category, search } = req.query;
  const db = req.app.locals.db;
  let sql = 'SELECT * FROM campaigns WHERE 1=1';
  const params = [];
  if (category && category !== 'Semua') { sql += ' AND category = ?'; params.push(category); }
  if (search) { sql += ' AND title LIKE ?'; params.push(`%${search}%`); }
  sql += ' ORDER BY is_urgent DESC, created_at DESC';
  db.all(sql, params, (err, rows) => res.json(rows || []));
});

// Get single campaign
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  db.get('SELECT * FROM campaigns WHERE id = ?', [req.params.id], (err, campaign) => {
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    campaign.updates = JSON.parse(campaign.updates || '[]');
    res.json(campaign);
  });
});

module.exports = router;
