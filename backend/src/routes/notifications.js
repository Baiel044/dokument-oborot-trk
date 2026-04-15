const express = require("express");
const { authenticate } = require("../middleware/auth");
const { readDb, writeDb } = require("../data/store");

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  const notifications = db.notifications
    .filter((notification) => notification.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ notifications });
});

router.put("/:id/read", authenticate, (req, res) => {
  const db = readDb();
  const notification = db.notifications.find(
    (item) => item.id === req.params.id && item.userId === req.user.id
  );

  if (!notification) {
    return res.status(404).json({ message: "Билдирме табылган жок." });
  }

  notification.isRead = true;
  writeDb(db);
  res.json({ notification });
});

module.exports = router;
