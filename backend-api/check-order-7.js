const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Checking order #7 coordinates...\n');

db.get('SELECT id, user_id, pickup_address, latitude, longitude, status, created_at FROM pickup_orders WHERE id = 7', (err, order) => {
  if (err) {
    console.error('Error:', err.message);
    db.close();
    return;
  }
  
  if (!order) {
    console.log('Order #7 not found. Let\'s check all orders:');
    db.all('SELECT id, user_id, pickup_address, latitude, longitude, status FROM pickup_orders ORDER BY id DESC LIMIT 5', (err, orders) => {
      if (err) console.error(err);
      else {
        console.log('\nLatest 5 orders:');
        orders.forEach(o => {
          console.log(`  Order #${o.id}: lat=${o.latitude}, lng=${o.longitude}, addr="${o.pickup_address}"`);
        });
      }
      db.close();
    });
  } else {
    console.log('Order #7 Details:');
    console.log('  ID:', order.id);
    console.log('  User ID:', order.user_id);
    console.log('  Address:', order.pickup_address);
    console.log('  Latitude:', order.latitude, '(type:', typeof order.latitude, ')');
    console.log('  Longitude:', order.longitude, '(type:', typeof order.longitude, ')');
    console.log('  Status:', order.status);
    console.log('  Created:', order.created_at);
    console.log('\nCoordinate Analysis:');
    
    // Check if coordinates are swapped (common bug)
    if (order.latitude > 90 || order.latitude < -90) {
      console.log('  ⚠️ LATITUDE OUT OF RANGE! Should be -90 to 90');
    }
    if (order.longitude > 180 || order.longitude < -180) {
      console.log('  ⚠️ LONGITUDE OUT OF RANGE! Should be -180 to 180');
    }
    
    // Check Indonesia bounds
    if (order.latitude < -11 || order.latitude > 6) {
      console.log('  ⚠️ Latitude outside Indonesia range (-11 to 6)');
    }
    if (order.longitude < 95 || order.longitude > 141) {
      console.log('  ⚠️ Longitude outside Indonesia range (95 to 141)');
    }
    
    // Check if looks swapped
    if (order.latitude > 90 && order.longitude >= -11 && order.longitude <= 6) {
      console.log('  🔴 COORDINATES APPEAR SWAPPED! Lat/Lng values look reversed');
      console.log('  Suggested fix: lat=' + order.longitude + ', lng=' + order.latitude);
    }
    
    db.close();
  }
});
