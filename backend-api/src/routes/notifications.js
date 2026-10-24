const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');

const listSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(30) });
const readSchema = z.object({ ids: z.array(z.number().int().positive()).max(200).optional() });

module.exports = function notificationRoutes({ services }) {
  const router = express.Router();

  router.get('/notifications', validate({ query: listSchema }), (req, res) => {
    res.json(services.notifications.list(req.auth.role, req.auth.id, req.valid.query.limit));
  });

  router.post('/notifications/read', validate({ body: readSchema }), (req, res) => {
    services.notifications.markRead(req.auth.role, req.auth.id, req.valid.body.ids);
    res.json({ success: true });
  });

  return router;
};
