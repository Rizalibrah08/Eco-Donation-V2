const { setup } = require('./helpers');

describe('auth', () => {
  let t;
  beforeEach(() => { t = setup(); });

  test('register mengembalikan token dan user tanpa password', async () => {
    const res = await t.api().post('/api/auth/register')
      .send({ name: 'Rina', email: ' Rina@Mail.com ', password: 'rahasia1' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ name: 'Rina', email: 'rina@mail.com', points: 0, role: 'user' });
    expect(res.body.user.password).toBeUndefined();
  });

  test('register email ganda → 409 EMAIL_TAKEN', async () => {
    await t.registerUser('Ani', 'a@mail.com');
    const res = await t.api().post('/api/auth/register').send({ name: 'Budi', email: 'a@mail.com', password: 'rahasia1' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  test('register validasi input', async () => {
    const res = await t.api().post('/api/auth/register').send({ name: 'B', email: 'bukan-email', password: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  test('password disimpan sebagai hash bcrypt', async () => {
    await t.registerUser('Ani', 'a@mail.com');
    const row = t.db.prepare('SELECT password FROM users WHERE email = ?').get('a@mail.com');
    expect(row.password).toMatch(/^\$2[aby]\$/);
  });

  test('login benar dan salah', async () => {
    await t.registerUser('Ani', 'a@mail.com');
    const ok = await t.api().post('/api/auth/login').send({ email: 'a@mail.com', password: 'rahasia1' });
    expect(ok.status).toBe(200);
    const bad = await t.api().post('/api/auth/login').send({ email: 'a@mail.com', password: 'salah123' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('login kurir', async () => {
    const res = await t.api().post('/api/auth/courier/login').send({ email: 'k1@kurir.com', password: 'rahasia1' });
    expect(res.status).toBe(200);
    expect(res.body.courier).toMatchObject({ email: 'k1@kurir.com', role: 'courier' });
  });

  test('tanpa token → 401, token rusak → 401', async () => {
    expect((await t.api().get('/api/users/me')).status).toBe(401);
    expect((await t.api().get('/api/users/me').set(t.auth('abc'))).status).toBe(401);
  });

  test('role dipisahkan: kurir tidak bisa ke endpoint user dan sebaliknya', async () => {
    const user = await t.registerUser();
    const courier = await t.loginCourier();
    const a = await t.api().get('/api/users/me').set(t.auth(courier.token));
    expect(a.status).toBe(403);
    const b = await t.api().get('/api/courier/tasks').set(t.auth(user.token));
    expect(b.status).toBe(403);
  });

  test('config rates publik', async () => {
    const res = await t.api().get('/api/config/rates');
    expect(res.status).toBe(200);
    expect(res.body.rates['Botol Plastik']).toBe(800);
    expect(res.body.min_donation).toBe(1000);
  });
});
