const { PORT, DB_PATH } = require('./src/config/env');
const { openDb } = require('./src/db');
const { createServer } = require('./src/server');

let db;
try {
  db = openDb(DB_PATH);
} catch (err) {
  console.error(`[db] ${err.message}`);
  process.exit(1);
}

const { server } = createServer({ db });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di http://0.0.0.0:${PORT}`);
});
