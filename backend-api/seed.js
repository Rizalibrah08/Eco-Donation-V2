const fs = require('fs');
const bcrypt = require('bcryptjs');
const { DB_PATH } = require('./src/config/env');
const { openDb } = require('./src/db');
const { createBadgeService } = require('./src/services/badgeService');

for (const suffix of ['', '-wal', '-shm']) {
  if (fs.existsSync(DB_PATH + suffix)) fs.unlinkSync(DB_PATH + suffix);
}

const db = openDb(DB_PATH);
const hash = bcrypt.hashSync('123456', 10);

const daysFromNow = (d, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
const dateOnly = (d) => daysFromNow(d).slice(0, 10);

db.transaction(() => {
  const insertUser = db.prepare(`INSERT INTO users (name, email, password, phone, points, total_kg, total_co2,
    total_donations_rp, total_setor_count, total_donasi_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  [
    ['Satrio', 'satrio@email.com', '08123456789', 12450, 156.5, 234.75, 45000, 12, 6],
    ['Budi Santoso', 'budi@email.com', '08234567890', 11200, 140, 210, 38000, 10, 5],
    ['Siti Nurhaliza', 'siti@email.com', '08345678901', 10800, 130, 195, 35000, 9, 4],
    ['Ahmad Rizki', 'ahmad@email.com', '08456789012', 9500, 110, 165, 30000, 8, 3],
    ['Dewi Lestari', 'dewi@email.com', '08567890123', 8900, 100, 150, 28000, 7, 3],
  ].forEach(([name, email, phone, ...stats]) => insertUser.run(name, email, hash, phone, ...stats));

  const insertCourier = db.prepare('INSERT INTO couriers (name, email, password, phone) VALUES (?, ?, ?, ?)');
  insertCourier.run('Andi Pratama', 'andi@kurir.com', hash, '08111222333');
  insertCourier.run('Bima Saputra', 'bima@kurir.com', hash, '08222333444');

  const insertCampaign = db.prepare(`INSERT INTO campaigns (title, description, category, organizer, target_amount,
    collected_amount, donor_count, image_url, location, deadline, is_urgent, updates)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  [
    ['Buku untuk Pesisir', 'Membantu menyediakan buku-buku berkualitas untuk anak-anak di daerah pesisir yang memiliki akses terbatas terhadap pendidikan.', 'Pendidikan', 'Yayasan Literasi Nusantara', 10000000, 8000000, 234, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800', 'Pantai Selatan, Jawa Tengah', dateOnly(40), 0,
      [{ date: dateOnly(-9), text: 'Telah menyalurkan 500 buku ke 3 sekolah' }, { date: dateOnly(-14), text: 'Kampanye telah mencapai 80% dari target!' }]],
    ['Tanam 1000 Pohon', 'Program penanaman 1000 pohon untuk menghijaukan kembali lahan kritis di Kalimantan.', 'Lingkungan', 'Green Earth Foundation', 20000000, 15000000, 567, 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', 'Kalimantan Timur', dateOnly(55), 0, []],
    ['Bantuan Banjir Bandung', 'Bantuan darurat untuk korban banjir di wilayah Bandung Selatan.', 'Bencana Alam', 'PMI Bandung', 30000000, 25000000, 1234, 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800', 'Bandung Selatan', dateOnly(20), 1, []],
    ['Panti Asuhan Harapan', 'Membantu kebutuhan sehari-hari anak-anak di Panti Asuhan Harapan.', 'Panti Asuhan', 'Panti Asuhan Harapan', 12000000, 5500000, 189, 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800', 'Jakarta Timur', dateOnly(70), 0, []],
    ['Laptop untuk Siswa', 'Menyediakan laptop bekas layak pakai untuk siswa kurang mampu.', 'Pendidikan', 'Tech for Kids', 25000000, 18000000, 421, 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800', 'Surabaya', dateOnly(60), 0, []],
    ['Pembersihan Pantai', 'Aksi bersih-bersih pantai dan edukasi masyarakat pesisir tentang pengelolaan sampah.', 'Lingkungan', 'Ocean Care ID', 5000000, 3000000, 98, 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800', 'Bali', dateOnly(90), 0, []],
  ].forEach(([...row]) => {
    const updates = row.pop();
    insertCampaign.run(...row, JSON.stringify(updates));
  });

  const insertOrder = db.prepare(`INSERT INTO pickup_orders (user_id, courier_id, status, pickup_address, pickup_lat,
    pickup_lng, scheduled_at, accepted_at, arrived_at, completed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertItem = db.prepare(
    'INSERT INTO pickup_items (order_id, category, estimated_weight, actual_weight) VALUES (?, ?, ?, ?)',
  );

  // 1: menunggu kurir
  let o = insertOrder.run(1, null, 'waiting', 'Universitas Indonesia, Depok', -6.3621, 106.8271, daysFromNow(1, 9), null, null, null, daysFromNow(0, 7)).lastInsertRowid;
  insertItem.run(o, 'Botol Kaca', 3, null);
  insertItem.run(o, 'Kertas', 2, null);
  // 2: kurir menuju lokasi
  o = insertOrder.run(1, 1, 'on_the_way', 'Jl. Sudirman No. 123, Jakarta Pusat', -6.2088, 106.8227, daysFromNow(0, 14), daysFromNow(0, 8), null, null, daysFromNow(-1, 8)).lastInsertRowid;
  insertItem.run(o, 'Botol Plastik', 2.5, null);
  insertItem.run(o, 'Kaleng', 1, null);
  // 3: kurir sudah tiba (siap ditimbang)
  o = insertOrder.run(2, 2, 'arrived', 'Jl. Margonda Raya No. 10, Depok', -6.3728, 106.8346, daysFromNow(0, 11), daysFromNow(0, 9), daysFromNow(0, 10), null, daysFromNow(-1, 9)).lastInsertRowid;
  insertItem.run(o, 'Kertas', 4, null);
  // 4: selesai
  o = insertOrder.run(1, 1, 'completed', 'Jl. Merdeka No. 45, Bandung', -6.9147, 107.6098, daysFromNow(-3, 14), daysFromNow(-3, 12), daysFromNow(-3, 14), daysFromNow(-3, 15), daysFromNow(-4, 6)).lastInsertRowid;
  insertItem.run(o, 'Botol Plastik', 2, 2.2);
  insertItem.run(o, 'Kertas', 1.5, 1.4);

  const insertTrx = db.prepare(`INSERT INTO transactions (user_id, type, title, description, points, ref_type, ref_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  insertTrx.run(1, 'setor', `Setor Sampah #${o}`, 'Botol Plastik 2.2 kg, Kertas 1.4 kg', 2600, 'pickup', o, daysFromNow(-3, 15));
  insertTrx.run(1, 'donasi', 'Donasi ke Panti Asuhan Harapan', 'Panti Asuhan Harapan', -5000, 'donation', null, daysFromNow(-4, 15));
  insertTrx.run(1, 'setor', 'Setor Sampah Kaleng', 'Kaleng 3 kg', 3000, 'pickup', null, daysFromNow(-6, 10));
})();

const badges = createBadgeService({ db, notifier: null });
for (const { id } of db.prepare('SELECT id FROM users').all()) badges.evaluate(id);

console.log(`Database berhasil dibuat di ${DB_PATH}`);
console.log('Akun demo (sandi 123456): satrio@email.com, budi@email.com, andi@kurir.com, bima@kurir.com');
db.close();
