const { setup } = require('./helpers');

describe('pickups', () => {
  let t, user, other, k1, k2;
  beforeEach(async () => {
    t = setup();
    user = await t.registerUser('User A', 'a@mail.com');
    other = await t.registerUser('User B', 'b@mail.com');
    k1 = await t.loginCourier('k1@kurir.com');
    k2 = await t.loginCourier('k2@kurir.com');
  });

  describe('membuat order', () => {
    test('sukses, user_id dari token, broadcast order:new', async () => {
      const res = await t.createOrder(user, { user_id: other.id });
      expect(res.status).toBe(201);
      expect(res.body.user_id).toBe(user.id);
      expect(res.body.status).toBe('waiting');
      expect(res.body.items).toHaveLength(2);
      expect(res.body.verification_code_hash).toBeUndefined();
      expect(t.events.find((e) => e.event === 'order:new' && e.room === 'couriers')).toBeTruthy();
    });

    test.each([
      ['koordinat di luar rentang', { pickup_lat: 120 }],
      ['kategori tidak dikenal', { items: [{ category: 'Plutonium', estimated_weight: 1 }] }],
      ['berat nol', { items: [{ category: 'Kertas', estimated_weight: 0 }] }],
      ['berat negatif', { items: [{ category: 'Kertas', estimated_weight: -3 }] }],
      ['kategori duplikat', { items: [{ category: 'Kertas', estimated_weight: 1 }, { category: 'Kertas', estimated_weight: 2 }] }],
      ['jadwal di masa lalu', { scheduled_at: '2020-01-01T00:00:00.000Z' }],
      ['alamat kosong', { pickup_address: '   ' }],
    ])('ditolak: %s', async (_, overrides) => {
      const res = await t.createOrder(user, overrides);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('kurir tidak boleh membuat order', async () => {
      const res = await t.createOrder(k1);
      expect(res.status).toBe(403);
    });
  });

  describe('otorisasi', () => {
    test('user lain mendapat 404 untuk order orang lain', async () => {
      const order = (await t.createOrder(user)).body;
      const res = await t.api().get(`/api/pickups/${order.id}`).set(t.auth(other.token));
      expect(res.status).toBe(404);
    });

    test('list hanya order milik sendiri', async () => {
      await t.createOrder(user);
      await t.createOrder(other);
      const res = await t.api().get('/api/pickups').set(t.auth(user.token));
      expect(res.body).toHaveLength(1);
      expect(res.body[0].user_id).toBe(user.id);
    });

    test('kurir lain tidak bisa melihat order yang sudah diambil', async () => {
      const order = (await t.createOrder(user)).body;
      await t.api().post(`/api/pickups/${order.id}/accept`).set(t.auth(k1.token));
      const res = await t.api().get(`/api/pickups/${order.id}`).set(t.auth(k2.token));
      expect(res.status).toBe(404);
    });

    test('kurir yang tidak ditugaskan tidak bisa weigh atau membuat kode', async () => {
      const { order } = await t.orderReadyToApprove(user, k1);
      const weigh = await t.api().post(`/api/pickups/${order.id}/weigh`).set(t.auth(k2.token))
        .send({ items: order.items.map((i) => ({ id: i.id, actual_weight: 1 })) });
      expect(weigh.status).toBe(404);
      const code = await t.api().post(`/api/pickups/${order.id}/code`).set(t.auth(k2.token));
      expect(code.status).toBe(404);
    });

    test('kurir tidak bisa approve', async () => {
      const { order, code } = await t.orderReadyToApprove(user, k1);
      const res = await t.api().post(`/api/pickups/${order.id}/approve`).set(t.auth(k1.token)).send({ code });
      expect(res.status).toBe(403);
    });

    test('user lain tidak bisa approve walau tahu kodenya', async () => {
      const { order, code } = await t.orderReadyToApprove(user, k1);
      const res = await t.api().post(`/api/pickups/${order.id}/approve`).set(t.auth(other.token)).send({ code });
      expect(res.status).toBe(404);
    });
  });

  test('accept bersamaan: satu berhasil, satu 409', async () => {
    const order = (await t.createOrder(user)).body;
    const [a, b] = await Promise.all([
      t.api().post(`/api/pickups/${order.id}/accept`).set(t.auth(k1.token)),
      t.api().post(`/api/pickups/${order.id}/accept`).set(t.auth(k2.token)),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.error.code).toBe('ALREADY_TAKEN');
  });

  test('daftar tugas kurir: available dan mine', async () => {
    const o1 = (await t.createOrder(user)).body;
    await t.createOrder(other);
    await t.api().post(`/api/pickups/${o1.id}/accept`).set(t.auth(k1.token));
    const available = await t.api().get('/api/courier/tasks?scope=available').set(t.auth(k1.token));
    const mine = await t.api().get('/api/courier/tasks?scope=mine').set(t.auth(k1.token));
    expect(available.body).toHaveLength(1);
    expect(mine.body.map((o) => o.id)).toEqual([o1.id]);
    expect(mine.body[0].items.length).toBe(2);
  });

  test('alur penuh sampai poin masuk', async () => {
    const { order, code, weigh } = await t.orderReadyToApprove(user, k1);
    expect(weigh.status).toBe(200);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(weigh.body.qr_payload).toBe(`ecodonation://verify?order=${order.id}&code=${code}`);

    // payload notifikasi ke user tidak membocorkan kode
    const weighed = t.events.find((e) => e.event === 'order:weighed');
    expect(weighed.room).toBe(`user:${user.id}`);
    expect(JSON.stringify(weighed.payload)).not.toContain(code);

    const summary = await t.api().get(`/api/pickups/${order.id}/verification`).set(t.auth(user.token));
    expect(summary.status).toBe(200);
    // 2.5 kg plastik × 800 + 1 kg kertas × 600
    expect(summary.body.total_points).toBe(2600);
    expect(JSON.stringify(summary.body)).not.toContain(code);

    const res = await t.api().post(`/api/pickups/${order.id}/approve`).set(t.auth(user.token))
      .send({ code: code.toLowerCase() });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ points_earned: 2600, total_kg: 3.5, co2: 5.25, balance: 2600 });

    const me = (await t.api().get('/api/users/me').set(t.auth(user.token))).body;
    expect(me).toMatchObject({ points: 2600, total_setor_count: 1, total_kg: 3.5 });
    const trx = (await t.api().get('/api/users/me/transactions').set(t.auth(user.token))).body;
    expect(trx[0]).toMatchObject({ type: 'setor', points: 2600, ref_type: 'pickup', ref_id: order.id });
    const completed = t.events.filter((e) => e.event === 'order:completed').map((e) => e.room);
    expect(completed).toEqual(expect.arrayContaining([`user:${user.id}`, `courier:${k1.id}`]));

    const again = await t.api().post(`/api/pickups/${order.id}/approve`).set(t.auth(user.token)).send({ code });
    expect(again.status).toBe(409);
  });

  test('transisi status yang tidak sah → 409', async () => {
    const order = (await t.createOrder(user)).body;
    await t.api().post(`/api/pickups/${order.id}/accept`).set(t.auth(k1.token));
    const weighBeforeArrive = await t.api().post(`/api/pickups/${order.id}/weigh`).set(t.auth(k1.token))
      .send({ items: order.items.map((i) => ({ id: i.id, actual_weight: 1 })) });
    expect(weighBeforeArrive.status).toBe(409);
    const verify = await t.api().get(`/api/pickups/${order.id}/verification`).set(t.auth(user.token));
    expect(verify.status).toBe(409);
  });

  test('weigh harus mencakup semua item order', async () => {
    const order = (await t.createOrder(user)).body;
    await t.api().post(`/api/pickups/${order.id}/accept`).set(t.auth(k1.token));
    await t.api().post(`/api/pickups/${order.id}/arrive`).set(t.auth(k1.token));
    const partial = await t.api().post(`/api/pickups/${order.id}/weigh`).set(t.auth(k1.token))
      .send({ items: [{ id: order.items[0].id, actual_weight: 1 }] });
    expect(partial.status).toBe(400);
    expect(partial.body.error.code).toBe('INVALID_ITEMS');
    const foreign = await t.api().post(`/api/pickups/${order.id}/weigh`).set(t.auth(k1.token))
      .send({ items: [{ id: order.items[0].id, actual_weight: 1 }, { id: 9999, actual_weight: 1 }] });
    expect(foreign.status).toBe(400);
  });

  describe('kode verifikasi', () => {
    test('kode salah mengurangi sisa percobaan, 5× salah mengunci', async () => {
      const { order, code } = await t.orderReadyToApprove(user, k1);
      const wrong = code === 'AAAAAA' ? 'BBBBBB' : 'AAAAAA';
      for (let i = 1; i <= 4; i++) {
        const res = await t.api().post(`/api/pickups/${order.id}/approve`).set(t.auth(user.token)).send({ code: wrong });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatchObject({ code: 'INVALID_CODE', remaining_attempts: 5 - i });
      }
      const locked = await t.api().post(`/api/pickups/${order.id}/approve`).set(t.auth(user.token)).send({ code: wrong });
      expect(locked.status).toBe(423);
      const evenRight = await t.api().post(`/api/pickups/${order.id}/approve`).set(t.auth(user.token)).send({ code });
      expect(evenRight.status).toBe(423);

      const fresh = await t.api().post(`/api/pickups/${order.id}/code`).set(t.auth(k1.token));
      expect(fresh.status).toBe(200);
      const ok = await t.api().post(`/api/pickups/${order.id}/approve`).set(t.auth(user.token)).send({ code: fresh.body.code });
      expect(ok.status).toBe(200);
    });

    test('kode kedaluwarsa setelah 30 menit → 410', async () => {
      const { order, code } = await t.orderReadyToApprove(user, k1);
      t.clock.t += 31 * 60 * 1000;
      const res = await t.api().post(`/api/pickups/${order.id}/approve`).set(t.auth(user.token)).send({ code });
      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('CODE_EXPIRED');
    });

    test('membuat kode baru membatalkan kode lama', async () => {
      const { order, code } = await t.orderReadyToApprove(user, k1);
      const fresh = (await t.api().post(`/api/pickups/${order.id}/code`).set(t.auth(k1.token))).body.code;
      if (fresh === code) return; // peluang sangat kecil
      const old = await t.api().post(`/api/pickups/${order.id}/approve`).set(t.auth(user.token)).send({ code });
      expect(old.status).toBe(400);
    });

    test('kode tidak tersimpan sebagai plaintext', async () => {
      const { order, code } = await t.orderReadyToApprove(user, k1);
      const row = t.db.prepare('SELECT * FROM pickup_orders WHERE id = ?').get(order.id);
      expect(JSON.stringify(row)).not.toContain(code);
    });
  });

  test('reject mengembalikan ke arrived lalu bisa ditimbang ulang', async () => {
    const { order } = await t.orderReadyToApprove(user, k1);
    const rej = await t.api().post(`/api/pickups/${order.id}/reject`).set(t.auth(user.token)).send({ reason: 'Beratnya kurang' });
    expect(rej.status).toBe(200);
    expect(rej.body.status).toBe('arrived');
    expect(t.events.find((e) => e.event === 'order:rejected').room).toBe(`courier:${k1.id}`);
    const again = await t.api().post(`/api/pickups/${order.id}/weigh`).set(t.auth(k1.token))
      .send({ items: order.items.map((i) => ({ id: i.id, actual_weight: 3 })) });
    expect(again.status).toBe(200);
  });

  describe('pembatalan', () => {
    test('user membatalkan order waiting', async () => {
      const order = (await t.createOrder(user)).body;
      const res = await t.api().post(`/api/pickups/${order.id}/cancel`).set(t.auth(user.token)).send({});
      expect(res.body.status).toBe('cancelled');
    });

    test('user tidak bisa membatalkan setelah kurir tiba', async () => {
      const order = (await t.createOrder(user)).body;
      await t.api().post(`/api/pickups/${order.id}/accept`).set(t.auth(k1.token));
      await t.api().post(`/api/pickups/${order.id}/arrive`).set(t.auth(k1.token));
      const res = await t.api().post(`/api/pickups/${order.id}/cancel`).set(t.auth(user.token)).send({});
      expect(res.status).toBe(409);
    });

    test('kurir membatalkan → order kembali waiting tanpa kurir', async () => {
      const order = (await t.createOrder(user)).body;
      await t.api().post(`/api/pickups/${order.id}/accept`).set(t.auth(k1.token));
      const res = await t.api().post(`/api/pickups/${order.id}/cancel`).set(t.auth(k1.token)).send({});
      expect(res.body).toMatchObject({ status: 'waiting', courier_id: null });
      const take = await t.api().post(`/api/pickups/${order.id}/accept`).set(t.auth(k2.token));
      expect(take.status).toBe(200);
    });

    test('user lain tidak bisa membatalkan', async () => {
      const order = (await t.createOrder(user)).body;
      const res = await t.api().post(`/api/pickups/${order.id}/cancel`).set(t.auth(other.token)).send({});
      expect(res.status).toBe(404);
    });
  });
});
