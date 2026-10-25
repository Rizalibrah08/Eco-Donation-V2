const { setup } = require('./helpers');

describe('donasi & kampanye', () => {
  let t, user, other;
  beforeEach(async () => {
    t = setup();
    user = await t.registerUser('User A', 'a@mail.com', 10000);
    other = await t.registerUser('User B', 'b@mail.com', 10000);
  });

  const donate = (u, body) => t.api().post('/api/donations').set(t.auth(u.token)).send(body);
  const points = (id) => t.db.prepare('SELECT points FROM users WHERE id = ?').get(id).points;

  test('donasi ke kampanye lokal', async () => {
    const res = await donate(user, { campaign_id: 1, points: 3000 });
    expect(res.status).toBe(201);
    expect(res.body.balance).toBe(7000);
    const c = (await t.api().get('/api/campaigns/1').set(t.auth(user.token))).body;
    expect(c).toMatchObject({ collected_amount: 3000, donor_count: 1 });
    const trx = (await t.api().get('/api/users/me/transactions').set(t.auth(user.token))).body;
    expect(trx[0]).toMatchObject({ type: 'donasi', points: -3000, ref_type: 'donation' });
  });

  test('donasi eksternal di-upsert, donor_count dihitung per user', async () => {
    const body = { source: 'everyorg', external_id: '123456789', title: 'Save Reefs', points: 1000 };
    await donate(user, body);
    await donate(user, body);
    await donate(other, { ...body, points: 2000 });
    const rows = t.db.prepare("SELECT * FROM campaigns WHERE source = 'everyorg'").all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ collected_amount: 4000, donor_count: 2 });
    const stats = await t.api().get('/api/campaigns/external/everyorg/123456789/stats').set(t.auth(user.token));
    expect(stats.body).toEqual({ collected_points: 4000, donor_count: 2 });
    const none = await t.api().get('/api/campaigns/external/everyorg/999/stats').set(t.auth(user.token));
    expect(none.body).toEqual({ collected_points: 0, donor_count: 0 });
  });

  test('saldo kurang → 400 dan tidak ada perubahan apa pun', async () => {
    const res = await donate(user, { campaign_id: 1, points: 50000 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_POINTS');
    expect(points(user.id)).toBe(10000);
    expect(t.db.prepare('SELECT COUNT(*) AS n FROM donations').get().n).toBe(0);
    expect(t.db.prepare('SELECT collected_amount FROM campaigns WHERE id = 1').get().collected_amount).toBe(0);
  });

  test('saldo kurang pada kampanye eksternal juga rollback (tidak membuat baris kampanye)', async () => {
    await donate(user, { source: 'everyorg', external_id: 'x1', title: 'X', points: 99999 });
    expect(t.db.prepare("SELECT COUNT(*) AS n FROM campaigns WHERE source='everyorg'").get().n).toBe(0);
  });

  test.each([
    ['di bawah minimum', { campaign_id: 1, points: 500 }],
    ['bukan bilangan bulat', { campaign_id: 1, points: 1500.5 }],
    ['negatif', { campaign_id: 1, points: -2000 }],
    ['identitas dari body ditolak', { campaign_id: 1, points: 1000, user_id: 2 }],
  ])('validasi: %s', async (_, body) => {
    const res = await donate(user, body);
    expect(res.status).toBe(400);
    expect(points(user.id)).toBe(10000);
  });

  test('kampanye lokal tidak ada → 404', async () => {
    const res = await donate(user, { campaign_id: 99, points: 1000 });
    expect(res.status).toBe(404);
  });

  test('daftar kampanye hanya lokal, filter kategori', async () => {
    await donate(user, { source: 'everyorg', external_id: 'x1', title: 'X', points: 1000 });
    const all = await t.api().get('/api/campaigns?category=Semua').set(t.auth(user.token));
    expect(all.body).toHaveLength(1);
    const none = await t.api().get('/api/campaigns?category=Pendidikan').set(t.auth(user.token));
    expect(none.body).toHaveLength(0);
  });
});

describe('profil & leaderboard', () => {
  let t, user;
  beforeEach(async () => {
    t = setup();
    user = await t.registerUser('User A', 'a@mail.com', 500);
    await t.registerUser('User B', 'b@mail.com', 900);
  });

  test('update profil hanya nama/telepon', async () => {
    const res = await t.api().patch('/api/users/me').set(t.auth(user.token)).send({ name: 'Nama Baru', phone: '0812' });
    expect(res.body).toMatchObject({ name: 'Nama Baru', phone: '0812' });
    const bad = await t.api().patch('/api/users/me').set(t.auth(user.token)).send({ email: 'x@y.com' });
    expect(bad.status).toBe(400);
  });

  test('ganti password', async () => {
    const wrong = await t.api().post('/api/users/me/password').set(t.auth(user.token))
      .send({ current_password: 'salah', new_password: 'barubaru' });
    expect(wrong.status).toBe(400);
    const ok = await t.api().post('/api/users/me/password').set(t.auth(user.token))
      .send({ current_password: 'rahasia1', new_password: 'barubaru' });
    expect(ok.status).toBe(200);
    const login = await t.api().post('/api/auth/login').send({ email: 'a@mail.com', password: 'barubaru' });
    expect(login.status).toBe(200);
  });

  test('leaderboard dengan peringkat saya', async () => {
    const res = await t.api().get('/api/leaderboard').set(t.auth(user.token));
    expect(res.body.entries.map((e) => e.name)).toEqual(['User B', 'User A']);
    expect(res.body.me).toEqual({ rank: 2, points: 500 });
  });

  test('notifikasi: daftar & tandai dibaca', async () => {
    t.services.notifications.notify('user', user.id, 'order:accepted', { orderId: 1, title: 'T', message: 'M' });
    const list = await t.api().get('/api/notifications').set(t.auth(user.token));
    expect(list.body.unread_count).toBe(1);
    await t.api().post('/api/notifications/read').set(t.auth(user.token)).send({});
    const after = await t.api().get('/api/notifications').set(t.auth(user.token));
    expect(after.body.unread_count).toBe(0);
  });
});
