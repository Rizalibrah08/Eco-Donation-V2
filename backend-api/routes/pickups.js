const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Point rates per kg
const RATES = { 'Botol Plastik': 800, 'Kertas': 600, 'Kaleng': 1000, 'Botol Kaca': 500 };

// Create pickup order
router.post('/', (req, res) => {
  const { user_id, items, pickup_address, scheduled_at } = req.body;
  if (!user_id || !items?.length) return res.status(400).json({ error: 'user_id and items required' });

  const db = req.app.locals.db;
  db.run('INSERT INTO pickup_orders (user_id, pickup_address, scheduled_at) VALUES (?, ?, ?)',
    [user_id, pickup_address, scheduled_at],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const orderId = this.lastID;
      const stmt = db.prepare('INSERT INTO pickup_items (order_id, category, estimated_weight) VALUES (?, ?, ?)');
      items.forEach(item => stmt.run(orderId, item.category, item.estimated_weight));
      stmt.finalize();
      res.json({ id: orderId, status: 'waiting' });
    });
});

// Get pickups by user
router.get('/', (req, res) => {
  const { user_id, status, courier_id } = req.query;
  const db = req.app.locals.db;
  let sql = 'SELECT * FROM pickup_orders WHERE 1=1';
  const params = [];
  if (user_id) { sql += ' AND user_id = ?'; params.push(user_id); }
  if (courier_id) { sql += ' AND courier_id = ?'; params.push(courier_id); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';

  db.all(sql, params, (err, orders) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!orders?.length) return res.json([]);
    // Attach items to each order
    let completed = 0;
    orders.forEach((order, i) => {
      db.all('SELECT * FROM pickup_items WHERE order_id = ?', [order.id], (err, items) => {
        if (err) console.error(err);
        orders[i].items = items || [];
        completed++;
        if (completed === orders.length) res.json(orders);
      });
    });
  });
});

// Get single pickup
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  db.get(`SELECT po.*, u.name as user_name FROM pickup_orders po
    JOIN users u ON po.user_id = u.id
    WHERE po.id = ?`, [req.params.id], (err, order) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!order) return res.status(404).json({ error: 'Not found' });
    db.all('SELECT * FROM pickup_items WHERE order_id = ?', [order.id], (err, items) => {
      if (err) return res.status(500).json({ error: err.message });
      order.items = items || [];
      res.json(order);
    });
  });
});

// Update status (courier accepts/starts)
router.patch('/:id/status', (req, res) => {
  const { status, courier_id } = req.body;
  const db = req.app.locals.db;
  let sql = 'UPDATE pickup_orders SET status = ?';
  const params = [status];
  if (courier_id) { sql += ', courier_id = ?'; params.push(courier_id); }
  sql += ' WHERE id = ?';
  params.push(req.params.id);
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    if (status === 'on_the_way' && courier_id) {
      db.get('SELECT po.user_id, c.name FROM pickup_orders po JOIN couriers c ON c.id = po.courier_id WHERE po.id = ?', [req.params.id], (err, data) => {
        if (data) {
          req.app.locals.notificationService.emitCourierAccepted(parseInt(req.params.id), data.user_id, data.name);
        }
      });
    }

    res.json({ success: true });
  });
});

// Courier submits actual weight → generates QR token
router.post('/:id/weigh', (req, res) => {
  const { items } = req.body; // [{id, actual_weight}]
  if (!items?.length) return res.status(400).json({ error: 'items required' });

  const db = req.app.locals.db;
  const token = crypto.randomBytes(32).toString('hex');
  const shortToken = token.substring(0, 6).toUpperCase();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  db.serialize(() => {
    // Update items with actual weight
    const stmt = db.prepare('UPDATE pickup_items SET actual_weight = ? WHERE id = ?');
    items.forEach(item => stmt.run(item.actual_weight, item.id));
    stmt.finalize();

    // Set token and status
    db.run('UPDATE pickup_orders SET status = ?, verification_token = ?, short_token = ?, token_expires_at = ? WHERE id = ?',
      ['pending_verification', token, shortToken, expires, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        // Return QR payload
        const qrPayload = JSON.stringify({ order_id: parseInt(req.params.id), token, items });

        // Emit notification to user
        const notificationService = req.app.locals.notificationService;
        db.get('SELECT user_id FROM pickup_orders WHERE id = ?', [req.params.id], (err, order) => {
          if (order) {
            notificationService.emitQRReady(order.user_id, parseInt(req.params.id), token, items);
          }
        });

        res.json({ qr_payload: qrPayload, short_token: shortToken, expires_at: expires });
      });
  });
});

// Get QR data for display
router.get('/:id/qr', (req, res) => {
  const db = req.app.locals.db;
  db.get('SELECT id, verification_token, short_token, token_expires_at FROM pickup_orders WHERE id = ? AND status = ?',
    [req.params.id, 'pending_verification'], (err, order) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!order) return res.status(404).json({ error: 'No pending verification' });
      db.all('SELECT id, category, actual_weight FROM pickup_items WHERE order_id = ?', [order.id], (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        const payload = JSON.stringify({ order_id: order.id, token: order.verification_token, items });
        res.json({ qr_payload: payload, short_token: order.short_token, expires_at: order.token_expires_at });
      });
    });
});

// User or Courier verifies QR scan
router.post('/:id/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });

  const db = req.app.locals.db;
  const tokenUpper = token.toUpperCase();
  console.log(`[VERIFY] Order #${req.params.id} — received token: "${token}" (upper: "${tokenUpper}")`);

  // First, let's see what the order actually has
  db.get('SELECT id, status, verification_token, short_token, token_expires_at FROM pickup_orders WHERE id = ?',
    [req.params.id], (err, debugOrder) => {
      if (debugOrder) {
        console.log(`[VERIFY] DB order #${debugOrder.id} — status: ${debugOrder.status}, short_token: "${debugOrder.short_token}", verification_token: "${debugOrder.verification_token?.substring(0,10)}...", expires: ${debugOrder.token_expires_at}`);
      } else {
        console.log(`[VERIFY] No order found with id ${req.params.id}`);
      }
    });

  db.get('SELECT * FROM pickup_orders WHERE id = ? AND (verification_token = ? OR UPPER(short_token) = ?)',
    [req.params.id, token, tokenUpper], (err, order) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!order) return res.status(400).json({ error: 'Token tidak valid. Pastikan token yang dimasukkan sesuai.' });
      if (new Date(order.token_expires_at) < new Date()) return res.status(400).json({ error: 'Token sudah kedaluwarsa. Silakan minta kurir men-generate token baru.' });
      
      console.log(`[VERIFY] Token matched for order #${order.id}! Proceeding to complete...`);

      // Calculate points from actual weights
      db.all('SELECT * FROM pickup_items WHERE order_id = ?', [order.id], (err, items) => {
        let totalPoints = 0;
        let totalKg = 0;
        items.forEach(item => {
          const weight = item.actual_weight || item.estimated_weight;
          totalPoints += Math.round(weight * (RATES[item.category] || 600));
          totalKg += weight;
        });

        const co2 = totalKg * 1.5;
        const desc = items.map(i => `${i.category} ${i.actual_weight}Kg`).join(', ');

        db.serialize(() => {
          // Complete order with atomic status check
          db.run('UPDATE pickup_orders SET status = ?, completed_at = ? WHERE id = ? AND status = ? AND (verification_token = ? OR UPPER(short_token) = ?)',
            ['completed', new Date().toISOString(), order.id, 'pending_verification', token, tokenUpper], function(err) {
              if (err) return res.status(500).json({ error: err.message });
              if (this.changes === 0) return res.status(400).json({ error: 'Order sudah diverifikasi sebelumnya.' });

              // Add points to user
              db.run('UPDATE users SET points = points + ?, total_kg = total_kg + ?, total_co2 = total_co2 + ?, total_setor_count = total_setor_count + 1 WHERE id = ?',
                [totalPoints, totalKg, co2, order.user_id]);
              // Create transaction record
              db.run('INSERT INTO transactions (user_id, type, title, description, points) VALUES (?, ?, ?, ?, ?)',
                [order.user_id, 'setor', `Setor Multi Kategori (Verified)`, desc, totalPoints]);

              // Emit real-time notification to user
              req.app.locals.notificationService.emitVerificationCompleted(order.user_id, order.id, totalPoints);

              res.json({ success: true, points_earned: totalPoints, total_kg: totalKg, items });
            });
        });
      });
    });
});

// Get pending tasks for courier
router.get('/courier/:courier_id/tasks', (req, res) => {
  const db = req.app.locals.db;
  db.all(`SELECT po.*, u.name as user_name FROM pickup_orders po
    JOIN users u ON po.user_id = u.id
    WHERE (po.courier_id = ? OR (po.courier_id IS NULL AND po.status = 'waiting'))
    AND po.status != 'completed'
    ORDER BY po.created_at DESC`, [req.params.courier_id], (err, orders) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!orders?.length) return res.json([]);
      let completed = 0;
      orders.forEach((order, i) => {
        db.all('SELECT * FROM pickup_items WHERE order_id = ?', [order.id], (err, items) => {
          if (err) console.error(err);
          orders[i].items = items || [];
          completed++;
          if (completed === orders.length) res.json(orders);
        });
      });
    });
});

module.exports = router;
