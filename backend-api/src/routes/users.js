const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/auth');

const updateSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(80).optional(),
    phone: z.string().trim().max(20).optional(),
  })
  .strict();

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Kata sandi saat ini wajib diisi.'),
  new_password: z.string().min(6, 'Kata sandi baru minimal 6 karakter.').max(100),
});

const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const leaderboardSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

module.exports = function userRoutes({ services }) {
  const router = express.Router();
  const userOnly = requireRole('user');

  router.get('/users/me', userOnly, (req, res) => {
    res.json(services.users.me(req.auth.id));
  });

  router.patch('/users/me', userOnly, validate({ body: updateSchema }), (req, res) => {
    res.json(services.users.update(req.auth.id, req.valid.body));
  });

  router.post('/users/me/password', userOnly, validate({ body: passwordSchema }), (req, res) => {
    services.users.changePassword(req.auth.id, req.valid.body);
    res.json({ success: true });
  });

  router.get('/users/me/transactions', userOnly, validate({ query: pageSchema }), (req, res) => {
    res.json(services.users.transactions(req.auth.id, req.valid.query));
  });

  router.get('/users/me/distribution', userOnly, (req, res) => {
    res.json(services.users.distribution(req.auth.id));
  });

  router.get('/leaderboard', validate({ query: leaderboardSchema }), (req, res) => {
    res.json(services.users.leaderboard(req.auth, req.valid.query.limit));
  });

  return router;
};
