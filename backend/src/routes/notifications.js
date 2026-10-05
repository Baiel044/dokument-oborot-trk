const express = require("express");
const { authenticate } = require("../middleware/auth");
const { appendAuditLog, readDb, writeDb } = require("../data/store");

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  const query = String(req.query.q || "").trim().toLowerCase();
  const unreadOnly = req.query.unread === "true";
  const dateFrom = String(req.query.dateFrom || "").trim();
  const dateTo = String(req.query.dateTo || "").trim();
  const notifications = db.notifications
    .filter((notification) => notification.userId === req.user.id)
    .filter((notification) => {
      if (unreadOnly && notification.isRead) {
        return false;
      }

      const createdAt = new Date(notification.createdAt).getTime();
      if (dateFrom) {
        const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
        if (!Number.isNaN(fromTime) && createdAt < fromTime) {
          return false;
        }
      }

      if (dateTo) {
        const toTime = new Date(`${dateTo}T23:59:59`).getTime();
        if (!Number.isNaN(toTime) && createdAt > toTime) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      return [notification.title, notification.text, notification.targetPath]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ notifications });
});

router.put("/read-all", authenticate, (req, res) => {
  const db = readDb();
  const now = new Date().toISOString();
  let updatedCount = 0;

  db.notifications.forEach((notification) => {
    if (notification.userId === req.user.id && !notification.isRead) {
      notification.isRead = true;
      notification.readAt = now;
      updatedCount += 1;
    }
  });

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Бардык билдирмелер окулду деп белгиленди",
    entityType: "notification",
    entityId: "read-all",
    req,
    metadata: { updatedCount },
  });
  res.json({ updatedCount });
});

function markNotificationRead(req, res) {
  const db = readDb();
  const notification = db.notifications.find(
    (item) => item.id === req.params.id && item.userId === req.user.id
  );

  if (!notification) {
    return res.status(404).json({ message: "Билдирме табылган жок." });
  }

  notification.isRead = true;
  notification.readAt = new Date().toISOString();
  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Билдирме окулду деп белгиленди",
    entityType: "notification",
    entityId: notification.id,
    req,
  });
  res.json({ notification });
}

router.put("/:id/read", authenticate, markNotificationRead);
router.patch("/:id/read", authenticate, markNotificationRead);

module.exports = router;
