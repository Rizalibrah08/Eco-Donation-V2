const { setup } = require('./helpers');

describe('lencana', () => {
  test('setoran pertama membuka Recycling Hero perunggu dan notifikasi', async () => {
    const t = setup();
    const user = await t.registerUser('User A', 'a@mail.com');
    const courier = await t.loginCourier();
    const { order, code } = await t.orderReadyToApprove(user, courier);
    await t.api().post(`/api/pickups/${order.id}/approve`).set(t.auth(user.token)).send({ code });

    const me = (await t.api().get('/api/users/me').set(t.auth(user.token))).body;
    const hero = me.badges.find((b) => b.key === 'recycling_hero');
    expect(hero).toMatchObject({ tier: 'bronze', next_tier: 'silver', next_target: 10 });
    const warrior = me.badges.find((b) => b.key === 'eco_warrior');
    expect(warrior.tier).toBeNull();
    expect(warrior.progress).toBeCloseTo(0.35);
    expect(t.events.find((e) => e.event === 'badge:unlocked' && e.payload.badge === 'recycling_hero')).toBeTruthy();
  });

  test('donasi menaikkan tingkat dan tidak membuat duplikat', async () => {
    const t = setup();
    const user = await t.registerUser('User A', 'a@mail.com', 50000);
    for (let i = 0; i < 5; i++) {
      await t.api().post('/api/donations').set(t.auth(user.token)).send({ campaign_id: 1, points: 1000 });
    }
    const rows = t.db.prepare("SELECT * FROM badges WHERE user_id = ? AND name = 'kind_heart'").all(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].tier).toBe('silver');
    const topDonor = t.db.prepare("SELECT tier FROM badges WHERE user_id = ? AND name = 'top_donor'").get(user.id);
    expect(topDonor.tier).toBe('bronze');
  });
});

describe('live tracking', () => {
  let t, user, courier, order;
  beforeEach(async () => {
    t = setup();
    user = await t.registerUser('User A', 'a@mail.com');
    courier = await t.loginCourier();
    order = (await t.createOrder(user, { pickup_lat: -6.2, pickup_lng: 106.8 })).body;
    await t.api().post(`/api/pickups/${order.id}/accept`).set(t.auth(courier.token));
  });

  const send = (lat, lng, who = courier) =>
    t.api().post(`/api/pickups/${order.id}/location`).set(t.auth(who.token)).send({ lat, lng });

  test('lokasi diteruskan ke user dengan jarak dan ETA', async () => {
    const res = await send(-6.22, 106.8);
    expect(res.status).toBe(200);
    expect(res.body.distance_m).toBeGreaterThan(2000);
    expect(res.body.eta_min).toBeGreaterThan(1);
    const ev = t.events.find((e) => e.event === 'order:location');
    expect(ev.room).toBe(`user:${user.id}`);
    const detail = (await t.api().get(`/api/pickups/${order.id}`).set(t.auth(user.token))).body;
    expect(detail.courier_lat).toBe(-6.22);
  });

  test('notifikasi "hampir sampai" hanya sekali', async () => {
    await send(-6.201, 106.8);
    await send(-6.2005, 106.8);
    expect(t.events.filter((e) => e.event === 'order:near')).toHaveLength(1);
  });

  test('hanya kurir yang ditugaskan, hanya saat on_the_way', async () => {
    const other = await t.loginCourier('k2@kurir.com');
    expect((await send(-6.2, 106.8, other)).status).toBe(404);
    expect((await send(-6.2, 106.8, user)).status).toBe(403);
    expect((await t.api().post(`/api/pickups/${order.id}/location`).set(t.auth(courier.token)).send({ lat: 200, lng: 0 })).status).toBe(400);
    await t.api().post(`/api/pickups/${order.id}/arrive`).set(t.auth(courier.token));
    expect((await send(-6.2, 106.8)).status).toBe(409);
  });
});
