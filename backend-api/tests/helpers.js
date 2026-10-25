const bcrypt = require('bcryptjs');
const request = require('supertest');
const { openDb } = require('../src/db');
const { createApp } = require('../src/app');

// Membuat app dengan DB in-memory, jam yang bisa dimajukan, dan emitter perekam event.
function setup() {
  const db = openDb(':memory:');
  const clock = { t: new Date('2030-01-01T08:00:00.000Z').getTime() };
  const events = [];
  const emitter = { emit: (room, event, payload) => events.push({ room, event, payload }) };
  const { app, services } = createApp({ db, emitter, now: () => new Date(clock.t) });

  const hash = bcrypt.hashSync('rahasia1', 4);
  const addCourier = (name, email) =>
    db.prepare('INSERT INTO couriers (name, email, password) VALUES (?, ?, ?)').run(name, email, hash).lastInsertRowid;
  addCourier('Kurir Satu', 'k1@kurir.com');
  addCourier('Kurir Dua', 'k2@kurir.com');
  db.prepare(`INSERT INTO campaigns (title, category, organizer, target_amount) VALUES ('Kampanye Lokal', 'Lingkungan', 'Org', 1000000)`).run();

  const api = () => request(app);

  async function registerUser(name = 'User A', email = 'a@mail.com', points = 0) {
    const res = await api().post('/api/auth/register').send({ name, email, password: 'rahasia1' });
    if (points) db.prepare('UPDATE users SET points = ? WHERE id = ?').run(points, res.body.user.id);
    return { id: res.body.user.id, token: res.body.token };
  }

  async function loginCourier(email = 'k1@kurir.com') {
    const res = await api().post('/api/auth/courier/login').send({ email, password: 'rahasia1' });
    return { id: res.body.courier.id, token: res.body.token };
  }

  const auth = (token) => ({ Authorization: `Bearer ${token}` });

  async function createOrder(user, overrides = {}) {
    const body = {
      items: [
        { category: 'Botol Plastik', estimated_weight: 2 },
        { category: 'Kertas', estimated_weight: 1 },
      ],
      pickup_address: 'Jl. Contoh No. 1',
      pickup_lat: -6.2,
      pickup_lng: 106.8,
      scheduled_at: new Date(clock.t + 60 * 60 * 1000).toISOString(),
      ...overrides,
    };
    return api().post('/api/pickups').set(auth(user.token)).send(body);
  }

  // Membawa order sampai status pending_verification; mengembalikan { order, code }.
  async function orderReadyToApprove(user, courier) {
    const order = (await createOrder(user)).body;
    await api().post(`/api/pickups/${order.id}/accept`).set(auth(courier.token));
    await api().post(`/api/pickups/${order.id}/arrive`).set(auth(courier.token));
    const weigh = await api()
      .post(`/api/pickups/${order.id}/weigh`)
      .set(auth(courier.token))
      .send({ items: order.items.map((i) => ({ id: i.id, actual_weight: i.category === 'Botol Plastik' ? 2.5 : 1 })) });
    return { order, code: weigh.body.code, weigh };
  }

  return { db, app, services, clock, events, api, auth, registerUser, loginCourier, createOrder, orderReadyToApprove };
}

module.exports = { setup };
