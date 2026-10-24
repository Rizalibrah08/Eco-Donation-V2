const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/auth');
const { HttpError } = require('../middleware/error');
const { CATEGORIES } = require('../config/rates');
const { NODE_ENV } = require('../config/env');

const weight = z.coerce
  .number({ invalid_type_error: 'Berat harus berupa angka.' })
  .gt(0, 'Berat harus lebih dari 0 kg.')
  .max(500, 'Berat maksimal 500 kg per kategori.');

const idParams = z.object({ id: z.coerce.number().int().positive() });

const createSchema = (now) =>
  z.object({
    items: z
      .array(
        z.object({
          category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Kategori sampah tidak dikenal.' }) }),
          estimated_weight: weight,
        }),
      )
      .min(1, 'Pilih minimal satu kategori sampah.')
      .max(CATEGORIES.length)
      .refine((items) => new Set(items.map((i) => i.category)).size === items.length, {
        message: 'Kategori sampah tidak boleh duplikat.',
      }),
    pickup_address: z.string().trim().min(1, 'Alamat penjemputan wajib diisi.').max(300),
    pickup_lat: z.coerce.number().min(-90, 'Latitude tidak valid.').max(90, 'Latitude tidak valid.'),
    pickup_lng: z.coerce.number().min(-180, 'Longitude tidak valid.').max(180, 'Longitude tidak valid.'),
    scheduled_at: z
      .string()
      .datetime({ offset: true, message: 'Format jadwal tidak valid.' })
      .refine((v) => new Date(v).getTime() >= now().getTime() - 5 * 60 * 1000, {
        message: 'Jadwal penjemputan tidak boleh di masa lalu.',
      }),
  });

const weighSchema = z.object({
  items: z
    .array(z.object({ id: z.coerce.number().int().positive(), actual_weight: weight }))
    .min(1, 'Berat aktual wajib diisi.'),
});

const reasonSchema = z.object({ reason: z.string().trim().max(200).optional() });
const approveSchema = z.object({ code: z.string().trim().min(4, 'Kode verifikasi tidak valid.').max(12) });
const listSchema = z.object({
  status: z.enum(['waiting', 'on_the_way', 'arrived', 'pending_verification', 'completed', 'cancelled']).optional(),
});
const tasksSchema = z.object({ scope: z.enum(['available', 'mine']).default('mine') });
const historySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(30) });

module.exports = function pickupRoutes({ services, now }) {
  const router = express.Router();
  const userOnly = requireRole('user');
  const courierOnly = requireRole('courier');
  const pickups = services.pickups;

  const approveLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    keyGenerator: (req) => `user:${req.auth.id}`,
    skip: () => NODE_ENV === 'test',
    validate: false,
    handler: (req, res, next) =>
      next(new HttpError(429, 'RATE_LIMITED', 'Terlalu banyak percobaan. Coba lagi dalam satu menit.')),
  });

  router.post('/pickups', userOnly, validate({ body: createSchema(now) }), (req, res) => {
    res.status(201).json(pickups.create(req.auth.id, req.valid.body));
  });

  router.get('/pickups', userOnly, validate({ query: listSchema }), (req, res) => {
    res.json(pickups.listForUser(req.auth.id, req.valid.query.status));
  });

  router.get('/pickups/:id', validate({ params: idParams }), (req, res) => {
    res.json(pickups.getForActor(req.valid.params.id, req.auth));
  });

  router.post('/pickups/:id/accept', courierOnly, validate({ params: idParams }), (req, res) => {
    res.json(pickups.accept(req.valid.params.id, req.auth.id));
  });

  router.post('/pickups/:id/arrive', courierOnly, validate({ params: idParams }), (req, res) => {
    res.json(pickups.arrive(req.valid.params.id, req.auth.id));
  });

  router.post('/pickups/:id/weigh', courierOnly, validate({ params: idParams, body: weighSchema }), (req, res) => {
    res.json(pickups.weigh(req.valid.params.id, req.auth.id, req.valid.body.items));
  });

  router.post('/pickups/:id/code', courierOnly, validate({ params: idParams }), (req, res) => {
    res.json(pickups.regenerateCode(req.valid.params.id, req.auth.id));
  });

  router.get('/pickups/:id/verification', userOnly, validate({ params: idParams }), (req, res) => {
    res.json(pickups.verification(req.valid.params.id, req.auth.id));
  });

  router.post('/pickups/:id/approve', userOnly, approveLimiter, validate({ params: idParams, body: approveSchema }),
    (req, res) => {
      res.json(pickups.approve(req.valid.params.id, req.auth.id, req.valid.body.code));
    });

  router.post('/pickups/:id/reject', userOnly, validate({ params: idParams, body: reasonSchema }), (req, res) => {
    res.json(pickups.reject(req.valid.params.id, req.auth.id, req.valid.body.reason));
  });

  router.post('/pickups/:id/cancel', validate({ params: idParams, body: reasonSchema }), (req, res) => {
    res.json(pickups.cancel(req.valid.params.id, req.auth, req.valid.body.reason));
  });

  router.get('/courier/me', courierOnly, (req, res) => {
    res.json(services.users.courierMe(req.auth.id));
  });

  router.get('/courier/tasks', courierOnly, validate({ query: tasksSchema }), (req, res) => {
    res.json(pickups.courierTasks(req.auth.id, req.valid.query.scope));
  });

  router.get('/courier/history', courierOnly, validate({ query: historySchema }), (req, res) => {
    res.json(pickups.courierHistory(req.auth.id, req.valid.query.limit));
  });

  return router;
};
