const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.run("UPDATE pickup_orders SET status = 'pending_verification', completed_at = NULL WHERE id = 52", function(err) {
  console.log(err ? err.message : 'Reset Order 52 successful, changes: ' + this.changes);
});
