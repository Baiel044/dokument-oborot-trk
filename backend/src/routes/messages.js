const express = require("express");
const { authenticate } = require("../middleware/auth");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");

const router = express.Router();

function decorateMessage(message, users) {
  const sender = users.find((user) => user.id === message.senderId);
  const receiver = users.find((user) => user.id === message.receiverId);
  return {
    ...message,
    senderName: sender?.fullName || "Белгисиз",
    receiverName: receiver?.fullName || "Бөлүм",
  };
}

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  const scope = req.query.scope || "all";
  let messages = db.messages.filter(
    (message) => message.senderId === req.user.id || message.receiverId === req.user.id
  );

  if (scope === "inbox") {
    messages = messages.filter((message) => message.receiverId === req.user.id);
  }
  if (scope === "sent") {
    messages = messages.filter((message) => message.senderId === req.user.id);
  }

  messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ messages: messages.map((message) => decorateMessage(message, db.users)) });
});

router.post("/", authenticate, (req, res) => {
  const { receiverId, departmentId, subject, text } = req.body;

  if (!text || (!receiverId && !departmentId)) {
    return res.status(400).json({ message: "Кабар тексти менен алуучуну көрсөтүңүз." });
  }

  const db = readDb();
  const createdAt = new Date().toISOString();
  const createdMessages = [];

  if (departmentId) {
    const recipients = db.users.filter(
      (user) => user.departmentId === departmentId && user.id !== req.user.id && user.status === "active"
    );

    recipients.forEach((recipient) => {
      createdMessages.push({
        id: createId("msg"),
        senderId: req.user.id,
        receiverId: recipient.id,
        departmentId,
        subject: subject || "Топтук кабар",
        text,
        isRead: false,
        audienceType: "department",
        createdAt,
      });

      db.notifications.unshift({
        id: createId("notif"),
        userId: recipient.id,
        title: "Жаңы кабар",
        text: `${req.user.fullName} сиздин бөлүмгө кабар жөнөттү.`,
        isRead: false,
        createdAt,
      });
    });
  } else {
    const recipient = db.users.find((user) => user.id === receiverId && user.status === "active");
    if (!recipient) {
      return res.status(404).json({ message: "Алуучу табылган жок." });
    }

    createdMessages.push({
      id: createId("msg"),
      senderId: req.user.id,
      receiverId,
      subject: subject || "Жеке кабар",
      text,
      isRead: false,
      audienceType: "direct",
      createdAt,
    });

    db.notifications.unshift({
      id: createId("notif"),
      userId: receiverId,
      title: "Жаңы кабар",
      text: `${req.user.fullName} сизге кабар жөнөттү.`,
      isRead: false,
      createdAt,
    });
  }

  db.messages.unshift(...createdMessages);
  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Кабар жөнөтүлдү",
    entityType: "message",
    entityId: createdMessages[0]?.id || "group",
  });

  res.status(201).json({
    messages: createdMessages.map((message) => decorateMessage(message, db.users)),
  });
});

router.get("/:id", authenticate, (req, res) => {
  const db = readDb();
  const message = db.messages.find((item) => item.id === req.params.id);

  if (!message) {
    return res.status(404).json({ message: "Кабар табылган жок." });
  }

  const canView =
    message.senderId === req.user.id ||
    message.receiverId === req.user.id ||
    ["ADMIN", "DIRECTOR"].includes(req.user.roleCode);

  if (!canView) {
    return res.status(403).json({ message: "Укук жетишсиз." });
  }

  res.json({ message: decorateMessage(message, db.users) });
});

router.put("/:id/read", authenticate, (req, res) => {
  const db = readDb();
  const message = db.messages.find((item) => item.id === req.params.id && item.receiverId === req.user.id);

  if (!message) {
    return res.status(404).json({ message: "Кабар табылган жок." });
  }

  message.isRead = true;
  writeDb(db);
  res.json({ message: decorateMessage(message, db.users) });
});

module.exports = router;
