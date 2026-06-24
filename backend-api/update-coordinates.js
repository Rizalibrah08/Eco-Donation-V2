const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Mengupdate koordinat untuk semua pickup_orders yang belum ada koordinat...');

db.serialize(() => {
  // Update data yang belum punya koordinat dengan koordinat Jakarta area
  db.run(`
    UPDATE pickup_orders 
    SET 
      latitude = CASE 
        WHEN id % 3 = 0 THEN -6.2088
        WHEN id % 3 = 1 THEN -6.3688
        ELSE -6.1751
      END,
      longitude = CASE 
        WHEN id % 3 = 0 THEN 106.8456
        WHEN id % 3 = 1 THEN 106.8325
        ELSE 106.8650
      END
    WHERE latitude IS NULL OR longitude IS NULL
  `, (err) => {
    if (err) {
      console.error('❌ Error update koordinat:', err);
    } else {
      console.log('✅ Koordinat berhasil diupdate untuk semua pickup_orders');
    }
    
    // Tampilkan hasil
    db.all(`SELECT id, pickup_address, latitude, longitude, status FROM pickup_orders`, (err, rows) => {
      if (err) {
        console.error('❌ Error:', err);
      } else {
        console.log('\n📍 Data Pickup Orders:');
        console.table(rows);
      }
      
      db.close(() => {
        console.log('\n✅ Database ditutup. Update selesai!');
      });
    });
  });
});
