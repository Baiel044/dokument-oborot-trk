const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { URL } = require("url");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");
const { JWT_SECRET } = require("../utils/config");
const { onNewNotification } = require("./notificationsHub");

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const clientsByUser = new Map();
let notificationListenerAttached = false;

function decorateMessage(message, users) {
  const sender = users.find((user) => user.id === message.senderId);
  const receiver = users.find((user) => user.id === message.receiverId);
  const isGlobal = message.audienceType === "global";

  return {
    ...message,
    senderName: sender?.fullName || "Неизвестно",
    receiverName: isGlobal ? "Общий чат" : receiver?.fullName || "Получатель",
    departmentTitle: "",
  };
}

function sendFrame(socket, opcode, payload = "") {
  if (!socket.writable) {
    return;
  }

  const data = Buffer.from(payload);
  let header;

  if (data.length < 126) {
    header = Buffer.from([0x80 | opcode, data.length]);
  } else if (data.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }

  socket.write(Buffer.concat([header, data]));
}

function sendJson(socket, payload) {
  sendFrame(socket, 0x1, JSON.stringify(payload));
}

function sendError(socket, message) {
  sendJson(socket, { type: "chat:error", message });
}

function decodeFrames(buffer) {
  const frames = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const firstByte = buffer[offset];
    const secondByte = buffer[offset + 1];
    const opcode = firstByte & 0x0f;
    const isMasked = Boolean(secondByte & 0x80);
    let length = secondByte & 0x7f;
    offset += 2;

    if (length === 126) {
      if (offset + 2 > buffer.length) break;
      length = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (offset + 8 > buffer.length) break;
      length = Number(buffer.readBigUInt64BE(offset));
      offset += 8;
    }

    let mask;
    if (isMasked) {
      if (offset + 4 > buffer.length) break;
      mask = buffer.subarray(offset, offset + 4);
      offset += 4;
    }

    if (offset + length > buffer.length) break;
    const payload = Buffer.from(buffer.subarray(offset, offset + length));
    offset += length;

    if (mask) {
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }
    }

    frames.push({ opcode, payload });
  }

  return frames;
}

function addClient(userId, socket) {
  const sockets = clientsByUser.get(userId) || new Set();
  sockets.add(socket);
  clientsByUser.set(userId, sockets);
}

function removeClient(userId, socket) {
  const sockets = clientsByUser.get(userId);
  if (!sockets) {
    return;
  }

  sockets.delete(socket);
  if (!sockets.size) {
    clientsByUser.delete(userId);
  }
}

function sendToUser(userId, payload) {
  const sockets = clientsByUser.get(userId);
  if (!sockets) {
    return;
  }

  sockets.forEach((socket) => sendJson(socket, payload));
}

function broadcast(payload) {
  clientsByUser.forEach((sockets) => {
    sockets.forEach((socket) => sendJson(socket, payload));
  });
}

function buildRequestFromSocket(req) {
  return {
    headers: req.headers,
    ip: req.socket?.remoteAddress || "",
    socket: req.socket,
  };
}

function createGlobalMessage(socket, payload, req) {
  const text = String(payload.text || "").trim();
  const subject = String(payload.subject || "").trim() || "Общий чат";

  if (!text) {
    sendError(socket, "Введите текст сообщения.");
    return;
  }

  const db = readDb();
  const message = {
    id: createId("msg"),
    senderId: socket.user.id,
    receiverId: null,
    subject,
    text,
    isRead: false,
    audienceType: "global",
    createdAt: new Date().toISOString(),
  };

  db.messages.unshift(message);
  writeDb(db);
  appendAuditLog({
    userId: socket.user.id,
    action: "Сообщение отправлено",
    entityType: "message",
    entityId: message.id,
    req: buildRequestFromSocket(req),
    metadata: { audienceType: "global", via: "websocket" },
  });

  broadcast({
    type: "chat:message",
    message: decorateMessage(message, db.users),
    createdCount: 1,
  });
}

function createDirectMessage(socket, payload, req) {
  const receiverId = String(payload.receiverId || "").trim();
  const text = String(payload.text || "").trim();
  const subject = String(payload.subject || "").trim() || "Личное сообщение";

  if (!receiverId || !text) {
    sendError(socket, "Выберите собеседника и введите текст сообщения.");
    return;
  }

  const db = readDb();
  const recipient = db.users.find((user) => user.id === receiverId && user.status === "active");
  if (!recipient) {
    sendError(socket, "Получатель не найден.");
    return;
  }

  const createdAt = new Date().toISOString();
  const message = {
    id: createId("msg"),
    senderId: socket.user.id,
    receiverId,
    subject,
    text,
    isRead: false,
    audienceType: "direct",
    createdAt,
  };

  db.messages.unshift(message);
  db.notifications.unshift({
    id: createId("notif"),
    userId: receiverId,
    title: "Новое сообщение",
    text: `${socket.user.fullName} отправил(а) вам сообщение.`,
    targetPath: `/messages?partnerId=${encodeURIComponent(socket.user.id)}`,
    isRead: false,
    createdAt,
  });
  writeDb(db);
  appendAuditLog({
    userId: socket.user.id,
    action: "Сообщение отправлено",
    entityType: "message",
    entityId: message.id,
    req: buildRequestFromSocket(req),
    metadata: { audienceType: "direct", receiverId, via: "websocket" },
  });

  const response = {
    type: "chat:message",
    message: decorateMessage(message, db.users),
    createdCount: 1,
  };
  sendToUser(socket.user.id, response);
  if (receiverId !== socket.user.id) {
    sendToUser(receiverId, response);
  }
}

function handleTextMessage(socket, text, req) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (_error) {
    sendError(socket, "Неверный формат сообщения.");
    return;
  }

  if (payload.type === "chat:ping") {
    sendJson(socket, { type: "chat:pong" });
    return;
  }

  if (payload.type !== "chat:send") {
    return;
  }

  if (payload.chatScope === "global") {
    createGlobalMessage(socket, payload, req);
    return;
  }

  createDirectMessage(socket, payload, req);
}

function rejectUpgrade(socket, statusCode, statusText) {
  socket.write(`HTTP/1.1 ${statusCode} ${statusText}\r\n\r\n`);
  socket.destroy();
}

function attachMessagesWebSocket(server) {
  if (!notificationListenerAttached) {
    onNewNotification((notification) => {
      sendToUser(notification.userId, {
        type: "notification:new",
        notification,
      });
    });
    notificationListenerAttached = true;
  }

  server.on("upgrade", (req, socket) => {
    const url = new URL(req.url || "", "http://localhost");
    if (url.pathname !== "/api/messages/ws") {
      return;
    }

    const token = url.searchParams.get("token");
    let user;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const db = readDb();
      user = db.users.find((item) => item.id === decoded.sub && item.status === "active");
    } catch (_error) {
      user = null;
    }

    if (!user) {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }

    const websocketKey = req.headers["sec-websocket-key"];
    if (!websocketKey) {
      rejectUpgrade(socket, 400, "Bad Request");
      return;
    }

    const acceptKey = crypto.createHash("sha1").update(`${websocketKey}${WS_GUID}`).digest("base64");
    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${acceptKey}`,
        "",
        "",
      ].join("\r\n")
    );

    socket.user = user;
    addClient(user.id, socket);
    sendJson(socket, { type: "chat:ready", userId: user.id });

    socket.on("data", (buffer) => {
      decodeFrames(buffer).forEach((frame) => {
        if (frame.opcode === 0x1) {
          handleTextMessage(socket, frame.payload.toString("utf8"), req);
        } else if (frame.opcode === 0x8) {
          removeClient(user.id, socket);
          socket.end();
        } else if (frame.opcode === 0x9) {
          sendFrame(socket, 0xA, frame.payload);
        }
      });
    });

    socket.on("close", () => removeClient(user.id, socket));
    socket.on("error", () => removeClient(user.id, socket));
  });
}

module.exports = { attachMessagesWebSocket };
