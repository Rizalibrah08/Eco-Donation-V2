const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { NODE_ENV } = require('./config/env');
const { RATES, CO2_PER_KG, POINT_TO_RUPIAH, MIN_DONATION } = require('./config/rates');
const { authenticate } = require('./middleware/auth');
const { HttpError, notFound, errorHandler } = require('./middleware/error');
const { createNotificationService } = require('./services/notificationService');
const { createAuthService } = require('./services/authService');
const { createUserService } = require('./services/userService');
const { createPickupService } = require('./services/pickupService');
const { createCampaignService } = require('./services/campaignService');
const { createBadgeService } = require('./services/badgeService');

// createApp({ db, emitter?, now? }) → { app, services }
function createApp({ db, emitter, now = () => new Date(), hooks = {} }) {
  const notifications = createNotificationService(db, emitter);
  const badges = createBadgeService({ db, notifier: notifications });
  const ctx = {
    db,
    notifier: notifications,
    badges,
    now,
    hooks: { onStatsChanged: (userId) => badges.evaluate(userId), ...hooks },
  };
  const services = {
    notifications,
    badges,
    auth: createAuthService(ctx),
    users: createUserService(ctx),
    pickups: createPickupService(ctx),
    campaigns: createCampaignService(ctx),
  };
  const deps = { services, now };

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skip: () => NODE_ENV === 'test',
    handler: (req, res, next) =>
      next(new HttpError(429, 'RATE_LIMITED', 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.')),
  });

  app.get('/api/health', (req, res) => {
    const { users } = db.prepare('SELECT COUNT(*) AS users FROM users').get();
    res.json({ status: 'ok', users });
  });

  app.get('/api/config/rates', (req, res) => {
    res.json({ rates: RATES, co2_per_kg: CO2_PER_KG, point_to_rupiah: POINT_TO_RUPIAH, min_donation: MIN_DONATION });
  });

  app.use('/api/auth', authLimiter, require('./routes/auth')(deps));

  app.use('/api', authenticate);
  app.use('/api', require('./routes/users')(deps));
  app.use('/api', require('./routes/pickups')(deps));
  app.use('/api', require('./routes/campaigns')(deps));
  app.use('/api', require('./routes/notifications')(deps));

  app.use(notFound);
  app.use(errorHandler);

  return { app, services };
}

module.exports = { createApp };
