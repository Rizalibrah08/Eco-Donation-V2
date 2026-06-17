const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const hash = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

// Register
router.post('/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });

  const db = req.app.locals.db;
  db.run('INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
    [name, email, hash(password), phone || null],
    function(err) {
      if (err) return res.status(400).json({ error: 'Email already exists' });
      res.json({ id: this.lastID, name, email });
    });
});

// Login user
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = req.app.locals.db;
  db.get('SELECT id, name, email, phone, points, total_kg, total_co2, total_donations_rp, total_setor_count, total_donasi_count FROM users WHERE email = ? AND password = ?',
    [email, hash(password)],
    (err, user) => {
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      res.json({ user, token: `token_${user.id}_${Date.now()}` });
    });
});

// Login courier
router.post('/courier/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = req.app.locals.db;
  db.get('SELECT id, name, email, phone FROM couriers WHERE email = ? AND password = ?',
    [email, hash(password)],
    (err, courier) => {
      if (!courier) return res.status(401).json({ error: 'Invalid credentials' });
      res.json({ courier, token: `ctoken_${courier.id}_${Date.now()}` });
    });
});

module.exports = router;
