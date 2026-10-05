const http = require("http");
const app = require("./app");
const { attachMessagesWebSocket } = require("./realtime/messagesSocket");
const { HOST, PORT } = require("./utils/config");

const server = http.createServer(app);

attachMessagesWebSocket(server);

server.listen(PORT, HOST, () => {
  console.log(`Server started on http://${HOST}:${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
});
