const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Menambahkan kolom latitude dan longitude ke tabel pickup_orders...');

db.serialize(() => {
  // Cek apakah kolom sudah ada
  db.all(`PRAGMA table_info(pickup_orders)`, (err, rows) => {
    if (err) {
      console.error('❌ Error:', err);
      return;
    }

    const hasLatitude = rows.some(row => row.name === 'latitude');
    const hasLongitude = rows.some(row => row.name === 'longitude');

    if (hasLatitude && hasLongitude) {
      console.log('✅ Kolom latitude dan longitude sudah ada!');
      db.close();
      return;
    }

    // Tambahkan kolom jika belum ada
    if (!hasLatitude) {
      db.run(`ALTER TABLE pickup_orders ADD COLUMN latitude REAL`, (err) => {
        if (err) {
          console.error('❌ Error menambahkan kolom latitude:', err);
        } else {
          console.log('✅ Kolom latitude berhasil ditambahkan');
        }
      });
    }

    if (!hasLongitude) {
      db.run(`ALTER TABLE pickup_orders ADD COLUMN longitude REAL`, (err) => {
        if (err) {
          console.error('❌ Error menambahkan kolom longitude:', err);
        } else {
          console.log('✅ Kolom longitude berhasil ditambahkan');
        }

        // Update data dummy dengan koordinat (contoh: Jakarta area)
        db.run(`
          UPDATE pickup_orders 
          SET latitude = -6.2088 + (RANDOM() % 100) * 0.001,
              longitude = 106.8456 + (RANDOM() % 100) * 0.001
          WHERE latitude IS NULL AND longitude IS NULL
        `, (err) => {
          if (err) {
            console.error('❌ Error update data dummy:', err);
          } else {
            console.log('✅ Data dummy berhasil diupdate dengan koordinat');
          }
          
          db.close(() => {
            console.log('✅ Migrasi selesai! Database ditutup.');
          });
        });
      });
    }
  });
});
