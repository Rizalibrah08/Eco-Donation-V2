class NotificationService {
  constructor(io, db) {
    this.io = io;
    this.db = db;
    this.userSockets = {}; // Map userId -> socketId
  }

  registerUserSocket(userId, socketId) {
    this.userSockets[userId] = socketId;
  }

  unregisterUserSocket(userId) {
    delete this.userSockets[userId];
  }

  emitNotification(userId, orderId, type, title, message) {
    // Log to database
    this.db.run(
      'INSERT INTO notifications (user_id, order_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [userId, orderId, type, title, message],
      (err) => {
        if (err) console.error('Failed to log notification:', err);
      }
    );

    // Emit via socket to specific user
    const socketId = this.userSockets[userId];
    if (socketId && this.io.sockets.sockets.get(socketId)) {
      this.io.to(socketId).emit('notification', {
        type,
        title,
        message,
        orderId,
        timestamp: new Date().toISOString()
      });
    }
  }

  emitOrderConfirmed(orderId, userId, address) {
    this.emitNotification(
      userId,
      orderId,
      'order_confirmed',
      'Permintaan Diterima',
      `Permintaan penjemputan #${orderId} berhasil dibuat. Kurir akan segera menuju ${address.substring(0, 30)}...`
    );
  }

  emitCourierAccepted(orderId, userId, courierName) {
    this.emitNotification(
      userId,
      orderId,
      'courier_accepted',
      'Kurir Diterima',
      `${courierName} telah menerima pesanan Anda. Kurir sedang menuju lokasi.`
    );
  }

  emitCourierNear(orderId, userId, distance) {
    this.emitNotification(
      userId,
      orderId,
      'courier_near',
      'Kurir Dekat!',
      `Kurir tiba dalam sekitar ${Math.ceil(distance / 100)} menit. Siapkan sampah Anda!`
    );
  }

  emitCourierArrived(orderId, userId) {
    this.emitNotification(
      userId,
      orderId,
      'courier_arrived',
      'Kurir Sampai',
      'Kurir sudah tiba di lokasi Anda. Buka pintu atau keluar untuk bertemu kurir.'
    );
  }

  emitReadyToScan(orderId, userId) {
    this.emitNotification(
      userId,
      orderId,
      'ready_to_scan',
      'Siap Scan QR',
      'Kurir telah menimbang barang Anda. Pindai QR di aplikasi untuk verifikasi dan mencairkan poin.'
    );
  }

  emitQRReady(userId, orderId, token, items) {
    const shortToken = token.substring(0, 6).toUpperCase();
    this.emitNotification(
      userId,
      orderId,
      'qr_ready',
      'QR Verifikasi Siap!',
      'Kurir telah menimbang barang Anda. Ketuk untuk memverifikasi dan mencairkan poin.'
    );

    const socketId = this.userSockets[userId];
    if (socketId && this.io.sockets.sockets.get(socketId)) {
      this.io.to(socketId).emit('qr_ready', {
        orderId,
        token,
        shortToken,
        items,
        timestamp: new Date().toISOString()
      });
    }
  }

  emitVerificationCompleted(userId, orderId, pointsEarned) {
    this.emitNotification(
      userId,
      orderId,
      'verification_completed',
      'Verifikasi Berhasil!',
      `Kurir telah menyelesaikan verifikasi. Anda mendapatkan tambahan ${pointsEarned} poin.`
    );

    const socketId = this.userSockets[userId];
    if (socketId && this.io.sockets.sockets.get(socketId)) {
      this.io.to(socketId).emit('verification_completed', {
        orderId,
        pointsEarned,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = NotificationService;
