const { Server } = require('socket.io');
const { verifyToken } = require('./middleware/auth');

// Socket.io dengan autentikasi JWT. Setiap koneksi masuk ke room `user:{id}`
// atau `courier:{id}`; kurir juga masuk room `couriers` untuk broadcast order baru.
function attachSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });

  io.use((socket, next) => {
    try {
      socket.data.auth = verifyToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.data.auth;
    socket.join(`${role}:${id}`);
    if (role === 'courier') socket.join('couriers');
  });

  const emitter = {
    emit(room, event, payload) {
      io.to(room).emit(event, payload);
    },
  };

  return { io, emitter };
}

module.exports = { attachSocket };
