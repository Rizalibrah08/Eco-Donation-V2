const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { requireRole } = require('../middleware/auth');
const { MIN_DONATION } = require('../config/rates');

const idParams = z.object({ id: z.coerce.number().int().positive() });

const listSchema = z.object({
  category: z.string().trim().max(50).optional().transform((v) => (v && v !== 'Semua' ? v : undefined)),
  search: z.string().trim().max(100).optional(),
});

const points = z
  .number({ invalid_type_error: 'Jumlah poin harus berupa angka.' })
  .int('Jumlah poin harus bilangan bulat.')
  .min(MIN_DONATION, `Donasi minimal ${MIN_DONATION.toLocaleString('id-ID')} poin.`);

const donationSchema = z.union([
  z.object({ campaign_id: z.number().int().positive(), points }).strict(),
  z
    .object({
      source: z.literal('everyorg'),
      external_id: z.string().trim().min(1).max(64),
      title: z.string().trim().min(1).max(200),
      image_url: z.string().url().max(500).optional(),
      points,
    })
    .strict(),
]);

module.exports = function campaignRoutes({ services }) {
  const router = express.Router();

  router.get('/campaigns', validate({ query: listSchema }), (req, res) => {
    res.json(services.campaigns.list(req.valid.query));
  });

  router.get('/campaigns/external/everyorg/:externalId/stats', (req, res) => {
    res.json(services.campaigns.externalStats('everyorg', String(req.params.externalId).slice(0, 64)));
  });

  router.get('/campaigns/:id', validate({ params: idParams }), (req, res) => {
    res.json(services.campaigns.get(req.valid.params.id));
  });

  router.get('/campaigns/:id/stats', validate({ params: idParams }), (req, res) => {
    res.json(services.campaigns.stats(req.valid.params.id));
  });

  router.post('/donations', requireRole('user'), validate({ body: donationSchema }), (req, res) => {
    res.status(201).json(services.campaigns.donate(req.auth.id, req.valid.body));
  });

  return router;
};
