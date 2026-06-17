const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, 'database.sqlite');

// Delete existing db
const fs = require('fs');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const { initDB } = require('./db');
const db = initDB();

// Simple hash for demo (not production-grade)
const hash = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

setTimeout(() => {
  db.serialize(() => {
    // Users
    db.run(`INSERT INTO users (name, email, password, phone, points, total_kg, total_co2, total_donations_rp, total_setor_count, total_donasi_count) VALUES
      ('Satrio', 'satrio@email.com', '${hash('123456')}', '08123456789', 12450, 156.5, 234.8, 45000, 156, 32)`);
    db.run(`INSERT INTO users (name, email, password, phone, points, total_kg, total_co2, total_donations_rp, total_setor_count, total_donasi_count) VALUES
      ('Budi Santoso', 'budi@email.com', '${hash('123456')}', '08234567890', 11200, 140, 210, 38000, 130, 28)`);
    db.run(`INSERT INTO users (name, email, password, phone, points, total_kg, total_co2, total_donations_rp, total_setor_count, total_donasi_count) VALUES
      ('Siti Nurhaliza', 'siti@email.com', '${hash('123456')}', '08345678901', 10800, 130, 195, 35000, 120, 25)`);
    db.run(`INSERT INTO users (name, email, password, phone, points, total_kg, total_co2, total_donations_rp, total_setor_count, total_donasi_count) VALUES
      ('Ahmad Rizki', 'ahmad@email.com', '${hash('123456')}', '08456789012', 9500, 110, 165, 30000, 100, 20)`);
    db.run(`INSERT INTO users (name, email, password, phone, points, total_kg, total_co2, total_donations_rp, total_setor_count, total_donasi_count) VALUES
      ('Dewi Lestari', 'dewi@email.com', '${hash('123456')}', '08567890123', 8900, 100, 150, 28000, 90, 18)`);

    // Couriers
    db.run(`INSERT INTO couriers (name, email, password, phone) VALUES
      ('Kurir Andi', 'andi@kurir.com', '${hash('123456')}', '08111222333')`);
    db.run(`INSERT INTO couriers (name, email, password, phone) VALUES
      ('Kurir Bima', 'bima@kurir.com', '${hash('123456')}', '08222333444')`);

    // Campaigns (matching design)
    db.run(`INSERT INTO campaigns (title, description, category, organizer, target_amount, collected_amount, donor_count, image_url, location, deadline, is_urgent, updates) VALUES
      ('Buku untuk Pesisir', 'Membantu menyediakan buku-buku berkualitas untuk anak-anak di daerah pesisir yang memiliki akses terbatas terhadap pendidikan.', 'Pendidikan', 'Yayasan Literasi Nusantara', 10000000, 8000000, 234, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400', 'Pantai Selatan, Jawa Tengah', '2026-05-30', 0, '${JSON.stringify([{date:"2026-04-15",text:"Telah menyalurkan 500 buku ke 3 sekolah"},{date:"2026-04-10",text:"Kampanye telah mencapai 80% dari target!"}])}')`);

    db.run(`INSERT INTO campaigns (title, description, category, organizer, target_amount, collected_amount, donor_count, image_url, location, deadline, is_urgent, updates) VALUES
      ('Tanam 1000 Pohon', 'Program penanaman 1000 pohon untuk menghijaukan kembali lahan kritis di Kalimantan.', 'Lingkungan', 'Green Earth Foundation', 20000000, 15000000, 567, 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400', 'Kalimantan Timur', '2026-06-15', 0, '[]')`);

    db.run(`INSERT INTO campaigns (title, description, category, organizer, target_amount, collected_amount, donor_count, image_url, location, deadline, is_urgent, updates) VALUES
      ('Bantuan Banjir Bandung', 'Bantuan darurat untuk korban banjir di wilayah Bandung Selatan.', 'Bencana Alam', 'PMI Bandung', 30000000, 25000000, 1234, 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400', 'Bandung Selatan', '2026-05-20', 1, '[]')`);

    db.run(`INSERT INTO campaigns (title, description, category, organizer, target_amount, collected_amount, donor_count, image_url, location, deadline, is_urgent, updates) VALUES
      ('Panti Asuhan Harapan', 'Membantu kebutuhan sehari-hari anak-anak di Panti Asuhan Harapan.', 'Panti Asuhan', 'Panti Asuhan Harapan', 12000000, 5500000, 189, 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400', 'Jakarta Timur', '2026-07-01', 0, '[]')`);

    db.run(`INSERT INTO campaigns (title, description, category, organizer, target_amount, collected_amount, donor_count, image_url, location, deadline, is_urgent, updates) VALUES
      ('Laptop untuk Siswa', 'Menyediakan laptop bekas layak pakai untuk siswa kurang mampu.', 'Pendidikan', 'Tech for Kids', 25000000, 18000000, 421, 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400', 'Surabaya', '2026-06-30', 0, '[]')`);

    db.run(`INSERT INTO campaigns (title, description, category, organizer, target_amount, collected_amount, donor_count, image_url, location, deadline, is_urgent, updates) VALUES
      ('Pembersihan Pantai', 'Aksi bersih-bersih pantai dan edukasi masyarakat pesisir tentang pengelolaan sampah.', 'Lingkungan', 'Ocean Care ID', 5000000, 3000000, 98, 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=400', 'Bali', '2026-08-01', 0, '[]')`);

    // Pickup orders for Satrio (user_id=1)
    const verifyToken = require('crypto').randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    db.run(`INSERT INTO pickup_orders (user_id, courier_id, status, pickup_address, scheduled_at, verification_token, token_expires_at, created_at) VALUES
      (1, 1, 'pending_verification', 'Jl. Sudirman No. 123', '2026-05-18 10:00', '${verifyToken}', '${tokenExpires}', '2026-05-17 08:00')`);
    db.run(`INSERT INTO pickup_orders (user_id, courier_id, status, pickup_address, scheduled_at, created_at) VALUES
      (1, NULL, 'waiting', 'Universitas Indonesia', '2026-05-19 09:00', '2026-05-18 07:00')`);
    db.run(`INSERT INTO pickup_orders (user_id, courier_id, status, pickup_address, scheduled_at, completed_at, created_at) VALUES
      (1, 1, 'completed', 'Jl. Merdeka No. 45', '2026-05-16 14:00', '2026-05-16 15:30', '2026-05-16 06:00')`);

    // Pickup items
    db.run(`INSERT INTO pickup_items (order_id, category, estimated_weight, actual_weight) VALUES (1, 'Botol Plastik', 2.5, 2.2)`);
    db.run(`INSERT INTO pickup_items (order_id, category, estimated_weight, actual_weight) VALUES (1, 'Kertas', 1.5, 1.4)`);
    db.run(`INSERT INTO pickup_items (order_id, category, estimated_weight, actual_weight) VALUES (1, 'Kaleng', 1.0, 0.8)`);
    db.run(`INSERT INTO pickup_items (order_id, category, estimated_weight) VALUES (2, 'Botol Kaca', 3.0)`);
    db.run(`INSERT INTO pickup_items (order_id, category, estimated_weight, actual_weight) VALUES (3, 'Botol Plastik', 2.0, 2.2)`);
    db.run(`INSERT INTO pickup_items (order_id, category, estimated_weight, actual_weight) VALUES (3, 'Kertas', 1.5, 1.4)`);

    // Transactions for Satrio
    db.run(`INSERT INTO transactions (user_id, type, title, description, points, created_at) VALUES
      (1, 'setor', 'Setor Multi Kategori (Verified)', 'Botol Plastik 2.2Kg, Kertas 1.4Kg', 3370, '2026-05-17 10:30')`);
    db.run(`INSERT INTO transactions (user_id, type, title, description, points, created_at) VALUES
      (1, 'donasi', 'Donasi ke Panti Asuhan', 'Panti Asuhan Harapan', -5000, '2026-05-16 15:20')`);
    db.run(`INSERT INTO transactions (user_id, type, title, description, points, created_at) VALUES
      (1, 'setor', 'Setor Kertas (Verified)', 'Kertas 3.2Kg', 1920, '2026-05-15 09:00')`);
    db.run(`INSERT INTO transactions (user_id, type, title, description, points, created_at) VALUES
      (1, 'donasi', 'Donasi ke Buku untuk Pesisir', 'Buku untuk Pesisir', -3000, '2026-05-13 11:00')`);
    db.run(`INSERT INTO transactions (user_id, type, title, description, points, created_at) VALUES
      (1, 'setor', 'Setor Kaleng (Verified)', 'Kaleng 1.5Kg', 1500, '2026-05-11 14:00')`);

    // Badges for Satrio
    db.run(`INSERT INTO badges (user_id, name, tier, icon) VALUES (1, 'Eco Warrior', 'gold', 'leaf')`);
    db.run(`INSERT INTO badges (user_id, name, tier, icon) VALUES (1, 'Recycling Hero', 'silver', 'refresh')`);
    db.run(`INSERT INTO badges (user_id, name, tier, icon) VALUES (1, 'Kind Heart', 'bronze', 'heart')`);

    console.log('✅ Database seeded successfully!');
  });
}, 500);
