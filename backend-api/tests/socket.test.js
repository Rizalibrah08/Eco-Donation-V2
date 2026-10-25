const { io: connect } = require('socket.io-client');
const { openDb } = require('../src/db');
const { createServer } = require('../src/server');
const { signToken } = require('../src/middleware/auth');

describe('socket', () => {
  let server, services, url;

  beforeAll((done) => {
    const db = openDb(':memory:');
    ({ server, services } = createServer({ db }));
    server.listen(0, () => {
      url = `http://localhost:${server.address().port}`;
      done();
    });
  });

  afterAll((done) => { server.close(done); });

  const open = (token) => connect(url, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });

  test('koneksi tanpa token ditolak', (done) => {
    const s = open(undefined);
    s.on('connect_error', (err) => {
      expect(err.message).toBe('UNAUTHORIZED');
      s.close();
      done();
    });
  });

  test('user hanya menerima event untuk dirinya, kurir menerima broadcast', (done) => {
    const user = open(signToken(7, 'user'));
    const courier = open(signToken(3, 'courier'));
    let connected = 0;
    let received = 0;
    const finish = () => { if (++received === 2) { user.close(); courier.close(); done(); } };

    user.on('order:accepted', (payload) => {
      expect(payload.notification.title).toBe('Halo');
      finish();
    });
    courier.on('order:new', (payload) => {
      expect(payload.orderId).toBe(42);
      finish();
    });
    user.on('order:new', () => done(new Error('user tidak boleh menerima broadcast kurir')));

    const ready = () => {
      if (++connected < 2) return;
      services.notifications.notify('user', 7, 'order:accepted', { orderId: 1, title: 'Halo', message: 'x' });
      services.notifications.broadcastCouriers('order:new', { orderId: 42 });
    };
    user.on('connect', ready);
    courier.on('connect', ready);
  });
});
