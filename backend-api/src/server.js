const http = require('http');
const { createApp } = require('./app');
const { attachSocket } = require('./socket');

function createServer({ db, now, hooks } = {}) {
  const { app, services } = createApp({ db, now, hooks });
  const server = http.createServer(app);
  const { io, emitter } = attachSocket(server);
  services.notifications.setEmitter(emitter);
  return { server, io, app, services };
}

module.exports = { createServer };
