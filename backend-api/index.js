const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initDB } = require('./db');
const NotificationService = require('./services/notificationService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize database
const db = initDB();
const notificationService = new NotificationService(io, db);

// Make db & notificationService accessible to routes
app.locals.db = db;
app.locals.notificationService = notificationService;

// Socket connection
io.on('connection', (socket) => {
  socket.on('register_user', (userId) => {
    notificationService.registerUserSocket(userId, socket.id);
  });
  
  socket.on('disconnect', () => {
    for (const [userId, id] of Object.entries(notificationService.userSockets)) {
      if (id === socket.id) {
        notificationService.unregisterUserSocket(userId);
      }
    }
  });
});

const { authenticate } = require('./middleware/authMiddleware');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', authenticate, require('./routes/users'));
app.use('/api/pickups', authenticate, require('./routes/pickups'));
app.use('/api/campaigns', authenticate, require('./routes/campaigns'));
app.use('/api/donations', authenticate, require('./routes/donations'));

app.get('/api/health', (req, res) => {
  db.get('SELECT COUNT(*) as users FROM users', (err, row) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message });
    res.json({ status: 'ok', users: row?.users || 0 });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
