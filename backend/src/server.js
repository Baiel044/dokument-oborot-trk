const http = require("http");
const app = require("./app");
const { attachMessagesWebSocket } = require("./realtime/messagesSocket");
const { scheduleBackups } = require("./data/backup");
const { closeStorage } = require("./data/store");
const { HOST, PORT } = require("./utils/config");

const server = http.createServer(app);

attachMessagesWebSocket(server);

server.listen(PORT, HOST, () => {
  console.log(`Server started on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  scheduleBackups();
});

function shutdown(signal) {
  console.log(`${signal} received, closing server...`);
  server.close(() => {
    closeStorage();
    process.exit(0);
  });
  setTimeout(() => {
    closeStorage();
    process.exit(0);
  }, 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
