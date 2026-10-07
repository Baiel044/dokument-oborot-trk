const express = require("express");
const { authenticate } = require("../middleware/auth");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");
const { DEPARTMENTS, getDepartmentTitle } = require("../utils/catalogs");
const { normalizeMessageInput } = require("../utils/messageValidation");

const router = express.Router();

function decorateMessage(message, users) {
  const sender = users.find((user) => user.id === message.senderId);
  const receiver = users.find((user) => user.id === message.receiverId);
  const isGlobal = message.audienceType === "global";
  const departmentTitle = message.departmentId ? getDepartmentTitle(message.departmentId) : "";
  return {
    ...message,
    senderName: sender?.fullName || "Белгисиз",
    receiverName: isGlobal ? "Общий чат" : receiver?.fullName || departmentTitle || "Бөлүм",
    departmentTitle,
  };
}

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  const scope = req.query.scope || "all";
  const query = String(req.query.q || "").trim().toLowerCase();
  const partnerId = String(req.query.partnerId || "").trim();
  const unreadOnly = req.query.unread === "true";
  let messages = db.messages.filter(
    (message) =>
      message.audienceType === "global" || message.senderId === req.user.id || message.receiverId === req.user.id
  );

  if (partnerId) {
    messages = messages.filter(
      (message) =>
        message.audienceType !== "global" &&
        ((message.senderId === req.user.id && message.receiverId === partnerId) ||
          (message.senderId === partnerId && message.receiverId === req.user.id))
    );
  }
  if (scope === "global") {
    messages = messages.filter((message) => message.audienceType === "global");
  }
  if (scope === "inbox") {
    messages = messages.filter((message) => message.receiverId === req.user.id);
  }
  if (scope === "sent") {
    messages = messages.filter((message) => message.senderId === req.user.id);
  }
  if (unreadOnly) {
    messages = messages.filter((message) => message.receiverId === req.user.id && !message.isRead);
  }
  if (query) {
    messages = messages.filter((message) => {
      const sender = db.users.find((user) => user.id === message.senderId);
      const receiver = db.users.find((user) => user.id === message.receiverId);
      const departmentTitle = message.departmentId ? getDepartmentTitle(message.departmentId) : "";

      return [
        message.subject,
        message.text,
        message.audienceType,
        message.departmentId,
        departmentTitle,
        sender?.fullName,
        receiver?.fullName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }

  messages.sort((a, b) => {
    const direction = partnerId ? 1 : -1;
    return direction * (new Date(a.createdAt) - new Date(b.createdAt));
  });
  res.json({ messages: messages.map((message) => decorateMessage(message, db.users)) });
});

router.post("/", authenticate, (req, res) => {
  const { receiverId, departmentId, audienceType, chatScope } = req.body;
  const isGlobal = audienceType === "global" || chatScope === "global";

  if (!receiverId && !departmentId && !isGlobal) {
    return res.status(400).json({ message: "Кабар тексти менен алуучуну көрсөтүңүз." });
  }

  const input = normalizeMessageInput(req.body, "");
  if (input.error) {
    return res.status(400).json({ message: input.error });
  }
  const { text } = input;
  const subject = input.subject || undefined;

  const db = readDb();
  const createdAt = new Date().toISOString();
  const createdMessages = [];

  if (isGlobal) {
    createdMessages.push({
      id: createId("msg"),
      senderId: req.user.id,
      receiverId: null,
      subject: subject || "Общий чат",
      text,
      isRead: false,
      audienceType: "global",
      createdAt,
    });
  } else if (departmentId) {
    const department = DEPARTMENTS.find((item) => item.id === departmentId);
    if (!department) {
      return res.status(400).json({ message: "Бөлүм туура тандалган жок." });
    }

    const recipients = db.users.filter(
      (user) => user.departmentId === departmentId && user.id !== req.user.id && user.status === "active"
    );

    if (!recipients.length) {
      return res.status(400).json({ message: "Бул бөлүмдө активдүү алуучулар жок." });
    }

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
        text: `${req.user.fullName} "${department.title}" бөлүмүнө кабар жөнөттү.`,
        targetPath: `/messages?partnerId=${encodeURIComponent(req.user.id)}`,
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
      targetPath: `/messages?partnerId=${encodeURIComponent(req.user.id)}`,
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
    req,
    metadata: {
      audienceType: isGlobal ? "global" : departmentId ? "department" : "direct",
      departmentId: departmentId || "",
      recipientCount: createdMessages.length,
    },
  });

  res.status(201).json({
    messages: createdMessages.map((message) => decorateMessage(message, db.users)),
    createdCount: createdMessages.length,
  });
});

router.get("/:id", authenticate, (req, res) => {
  const db = readDb();
  const message = db.messages.find((item) => item.id === req.params.id);

  if (!message) {
    return res.status(404).json({ message: "Кабар табылган жок." });
  }

  // Private correspondence is visible only to its participants, administrators included.
  const canView =
    message.audienceType === "global" || message.senderId === req.user.id || message.receiverId === req.user.id;

  if (!canView) {
    return res.status(403).json({ message: "Укук жетишсиз." });
  }

  res.json({ message: decorateMessage(message, db.users) });
});

function markMessageRead(req, res) {
  const db = readDb();
  const message = db.messages.find((item) => item.id === req.params.id && item.receiverId === req.user.id);

  if (!message) {
    return res.status(404).json({ message: "Кабар табылган жок." });
  }

  const wasUnread = !message.isRead;
  message.isRead = true;
  message.readAt = new Date().toISOString();
  writeDb(db);
  if (wasUnread) {
    appendAuditLog({
      userId: req.user.id,
      action: "Кабар окулду деп белгиленди",
      entityType: "message",
      entityId: message.id,
      req,
    });
  }
  res.json({ message: decorateMessage(message, db.users) });
}

router.put("/:id/read", authenticate, markMessageRead);
router.patch("/:id/read", authenticate, markMessageRead);

router.put("/read-all/inbox", authenticate, (req, res) => {
  const db = readDb();
  const now = new Date().toISOString();
  let updatedCount = 0;

  db.messages.forEach((message) => {
    if (message.receiverId === req.user.id && !message.isRead) {
      message.isRead = true;
      message.readAt = now;
      updatedCount += 1;
    }
  });

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Кирген кабарлар окулду деп белгиленди",
    entityType: "message",
    entityId: "read-all-inbox",
    req,
    metadata: { updatedCount },
  });
  res.json({ updatedCount });
});

module.exports = router;
