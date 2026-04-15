const express = require("express");
const { authenticate } = require("../middleware/auth");
const { readDb } = require("../data/store");
const { normalizeRequestStatus } = require("../utils/catalogs");

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  const myRequests = db.requests.filter((request) => request.userId === req.user.id);
  const myInbox = db.messages.filter((message) => message.receiverId === req.user.id);
  const unreadNotifications = db.notifications.filter(
    (notification) => notification.userId === req.user.id && !notification.isRead
  );

  const summary = {
    totalUsers: db.users.length,
    pendingUsers: db.users.filter((user) => user.status === "pending").length,
    totalRequests: db.requests.length,
    pendingRequests: db.requests.filter((request) =>
      ["Директор карап жатат", "Кадрлар бөлүмүнө жөнөтүлдү", "Бухгалтерияга жөнөтүлдү"].includes(
        normalizeRequestStatus(request.status)
      )
    ).length,
    approvedRequests: db.requests.filter((request) =>
      ["Директор кол койду"].includes(normalizeRequestStatus(request.status))
    ).length,
    documents: db.documents.length,
    myRequests: myRequests.length,
    inboxMessages: myInbox.length,
    unreadNotifications: unreadNotifications.length,
  };

  res.json({
    summary,
    recentRequests: db.requests.slice(0, 5).map((request) => ({
      ...request,
      status: normalizeRequestStatus(request.status),
    })),
    recentMessages: myInbox.slice(0, 5),
    recentNotifications: unreadNotifications.slice(0, 5),
  });
});

module.exports = router;
