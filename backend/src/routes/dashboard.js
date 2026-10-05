const express = require("express");
const { authenticate } = require("../middleware/auth");
const { readDb } = require("../data/store");
const { normalizeRequestStatus } = require("../utils/catalogs");

const router = express.Router();

function canViewRequest(user, request) {
  if (request.userId === user.id) {
    return true;
  }

  if (["ADMIN", "DIRECTOR"].includes(user.roleCode)) {
    return true;
  }

  if (request.currentRecipientRole === user.roleCode) {
    return true;
  }

  return (request.routeHistory || []).some(
    (step) => step.actorUserId === user.id || step.targetRoleCode === user.roleCode
  );
}

function canViewDocument(user, document) {
  if (["ADMIN", "DIRECTOR"].includes(user.roleCode)) {
    return true;
  }

  if (document.uploadedBy === user.id) {
    return true;
  }

  if (document.currentRecipientRole === user.roleCode) {
    return true;
  }

  return (document.assignments || []).some(
    (assignment) => assignment.recipientId === user.id || assignment.senderId === user.id
  );
}

function sortByNewest(items) {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
  );
}

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  const visibleRequests = db.requests.filter((request) => canViewRequest(req.user, request));
  const visibleDocuments = db.documents.filter((document) => canViewDocument(req.user, document));
  const myRequests = visibleRequests.filter((request) => request.userId === req.user.id);
  const myInbox = db.messages.filter((message) => message.receiverId === req.user.id);
  const unreadNotifications = db.notifications.filter(
    (notification) => notification.userId === req.user.id && !notification.isRead
  );

  const summary = {
    totalUsers: db.users.length,
    pendingUsers: db.users.filter((user) => user.status === "pending").length,
    totalRequests: visibleRequests.length,
    pendingRequests: visibleRequests.filter((request) =>
      [
        "Директор карап жатат",
        "Окуу бөлүмүнө жөнөтүлдү",
        "Кадрлар бөлүмүнө жөнөтүлдү",
        "Бухгалтерияга жөнөтүлдү",
      ].includes(normalizeRequestStatus(request.status))
    ).length,
    approvedRequests: visibleRequests.filter((request) =>
      ["Директор кол койду"].includes(normalizeRequestStatus(request.status))
    ).length,
    documents: visibleDocuments.length,
    myRequests: ["ADMIN", "DIRECTOR"].includes(req.user.roleCode) ? visibleRequests.length : myRequests.length,
    inboxMessages: myInbox.length,
    unreadNotifications: unreadNotifications.length,
  };

  res.json({
    summary,
    recentRequests: sortByNewest(visibleRequests).slice(0, 5).map((request) => ({
      ...request,
      status: normalizeRequestStatus(request.status),
    })),
    recentMessages: sortByNewest(myInbox).slice(0, 5),
    recentNotifications: sortByNewest(unreadNotifications).slice(0, 5),
  });
});

module.exports = router;
