const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { URL } = require("url");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");
const { JWT_SECRET } = require("../utils/config");
const { normalizeMessageInput } = require("../utils/messageValidation");
const { isTokenCurrent } = require("../utils/sessions");
const { onNewNotification } = require("./notificationsHub");

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const clientsByUser = new Map();
// A single chat message is at most a few KB; anything far larger is a broken or hostile client.
const MAX_WS_MESSAGE_BYTES = 64 * 1024;
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

/**
 * Parses complete frames from the start of `buffer`.
 * Returns the frames and how many bytes were consumed; an incomplete frame stays in the buffer
 * until the rest of it arrives in the next TCP chunk.
 */
function decodeFrames(buffer) {
  const frames = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    let cursor = offset;
    const firstByte = buffer[cursor];
    const secondByte = buffer[cursor + 1];
    const fin = Boolean(firstByte & 0x80);
    const opcode = firstByte & 0x0f;
    const isMasked = Boolean(secondByte & 0x80);
    let length = secondByte & 0x7f;
    cursor += 2;

    if (length === 126) {
      if (cursor + 2 > buffer.length) break;
      length = buffer.readUInt16BE(cursor);
      cursor += 2;
    } else if (length === 127) {
      if (cursor + 8 > buffer.length) break;
      const bigLength = buffer.readBigUInt64BE(cursor);
      length = bigLength > BigInt(MAX_WS_MESSAGE_BYTES) ? Infinity : Number(bigLength);
      cursor += 8;
    }

    if (length > MAX_WS_MESSAGE_BYTES) {
      return { frames, consumed: offset, tooLarge: true };
    }

    let mask;
    if (isMasked) {
      if (cursor + 4 > buffer.length) break;
      mask = buffer.subarray(cursor, cursor + 4);
      cursor += 4;
    }

    if (cursor + length > buffer.length) break;
    const payload = Buffer.from(buffer.subarray(cursor, cursor + length));
    cursor += length;

    if (mask) {
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] ^= mask[index % 4];
      }
    }

    frames.push({ fin, opcode, payload });
    offset = cursor;
  }

  return { frames, consumed: offset, tooLarge: false };
}

function closeSocket(socket, code = 1000) {
  const payload = Buffer.alloc(2);
  payload.writeUInt16BE(code, 0);
  sendFrame(socket, 0x8, payload);
  socket.end();
}

/** Re-reads the socket's user; closes the connection if the account was blocked, deleted or signed out. */
function refreshSocketUser(socket) {
  const db = readDb();
  const user = db.users.find((item) => item.id === socket.user.id);
  if (!isTokenCurrent(socket.tokenPayload, user)) {
    removeClient(socket.user.id, socket);
    closeSocket(socket, 1008);
    return null;
  }

  socket.user = user;
  return { user, db };
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

function getAllowedUsers() {
  const db = readDb();
  return new Map(db.users.filter((user) => user.status === "active").map((user) => [user.id, user]));
}

function deliver(sockets, payload, allowedUsers) {
  sockets.forEach((socket) => {
    const user = allowedUsers.get(socket.user.id);
    if (!isTokenCurrent(socket.tokenPayload, user)) {
      removeClient(socket.user.id, socket);
      closeSocket(socket, 1008);
      return;
    }
    sendJson(socket, payload);
  });
}

function sendToUser(userId, payload) {
  const sockets = clientsByUser.get(userId);
  if (!sockets) {
    return;
  }

  deliver([...sockets], payload, getAllowedUsers());
}

function broadcast(payload) {
  const allowedUsers = getAllowedUsers();
  [...clientsByUser.values()].forEach((sockets) => deliver([...sockets], payload, allowedUsers));
}

function buildRequestFromSocket(req) {
  return {
    headers: req.headers,
    ip: req.socket?.remoteAddress || "",
    socket: req.socket,
  };
}

function createGlobalMessage(socket, payload, req, db) {
  const input = normalizeMessageInput(payload, "Общий чат");
  if (input.error) {
    sendError(socket, input.error);
    return;
  }
  const { text, subject } = input;

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

function createDirectMessage(socket, payload, req, db) {
  const receiverId = String(payload.receiverId || "").trim();
  if (!receiverId) {
    sendError(socket, "Кабар алуучуну тандаңыз.");
    return;
  }

  const input = normalizeMessageInput(payload, "Личное сообщение");
  if (input.error) {
    sendError(socket, input.error);
    return;
  }
  const { text, subject } = input;

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

  if (!payload || payload.type !== "chat:send") {
    return;
  }

  const session = refreshSocketUser(socket);
  if (!session) {
    return;
  }

  if (payload.chatScope === "global") {
    createGlobalMessage(socket, payload, req, session.db);
    return;
  }

  createDirectMessage(socket, payload, req, session.db);
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
    let tokenPayload;
    try {
      tokenPayload = jwt.verify(token, JWT_SECRET);
      const db = readDb();
      const candidate = db.users.find((item) => item.id === tokenPayload.sub);
      user = isTokenCurrent(tokenPayload, candidate) ? candidate : null;
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
    socket.tokenPayload = tokenPayload;
    addClient(user.id, socket);
    sendJson(socket, { type: "chat:ready", userId: user.id });

    let pending = Buffer.alloc(0);
    let fragments = [];
    let fragmentsLength = 0;

    socket.on("data", (chunk) => {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
      const { frames, consumed, tooLarge } = decodeFrames(pending);
      pending = pending.subarray(consumed);

      if (tooLarge || pending.length > MAX_WS_MESSAGE_BYTES + 14) {
        removeClient(user.id, socket);
        closeSocket(socket, 1009);
        return;
      }

      frames.forEach((frame) => {
        if (frame.opcode === 0x8) {
          removeClient(user.id, socket);
          socket.end();
          return;
        }
        if (frame.opcode === 0x9) {
          sendFrame(socket, 0xA, frame.payload);
          return;
        }
        if (frame.opcode !== 0x1 && frame.opcode !== 0x0) {
          return;
        }

        // Text messages may arrive split into a first frame and continuation frames.
        if (frame.opcode === 0x1) {
          fragments = [];
          fragmentsLength = 0;
        }
        fragments.push(frame.payload);
        fragmentsLength += frame.payload.length;
        if (fragmentsLength > MAX_WS_MESSAGE_BYTES) {
          removeClient(user.id, socket);
          closeSocket(socket, 1009);
          return;
        }
        if (frame.fin) {
          const message = Buffer.concat(fragments).toString("utf8");
          fragments = [];
          fragmentsLength = 0;
          handleTextMessage(socket, message, req);
        }
      });
    });

    socket.on("close", () => removeClient(user.id, socket));
    socket.on("error", () => removeClient(user.id, socket));
  });
}

module.exports = { attachMessagesWebSocket };
