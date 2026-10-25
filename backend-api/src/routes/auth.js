const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');

const email = z.string().trim().toLowerCase().email('Format email tidak valid.');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(80),
  email,
  password: z.string().min(6, 'Kata sandi minimal 6 karakter.').max(100),
  phone: z.string().trim().max(20).optional(),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});

module.exports = function authRoutes({ services }) {
  const router = express.Router();

  router.post('/register', validate({ body: registerSchema }), (req, res) => {
    res.status(201).json(services.auth.register(req.valid.body));
  });

  router.post('/login', validate({ body: loginSchema }), (req, res) => {
    res.json(services.auth.login(req.valid.body));
  });

  router.post('/courier/login', validate({ body: loginSchema }), (req, res) => {
    res.json(services.auth.courierLogin(req.valid.body));
  });

  return router;
};
