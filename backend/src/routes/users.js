const express = require("express");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");
const { authenticate } = require("../middleware/auth");
const { sanitizeUser } = require("../utils/auth");
const { getDepartmentTitle, getRoleTitle } = require("../utils/catalogs");

const router = express.Router();

function canManageUsers(user) {
  return ["ADMIN", "DIRECTOR", "HR"].includes(user.roleCode);
}

function enrichUser(user) {
  return {
    ...sanitizeUser(user),
    roleTitle: getRoleTitle(user.roleCode),
    departmentTitle: getDepartmentTitle(user.departmentId),
  };
}

router.get("/me", authenticate, (req, res) => {
  res.json({ user: enrichUser(req.user) });
});

router.get("/directory", authenticate, (_req, res) => {
  const db = readDb();
  const users = db.users
    .filter((user) => user.status === "active")
    .map((user) => ({
      id: user.id,
      fullName: user.fullName,
      roleTitle: getRoleTitle(user.roleCode),
      departmentTitle: getDepartmentTitle(user.departmentId),
    }));

  res.json({ users });
});

router.get("/", authenticate, (req, res) => {
  if (!canManageUsers(req.user)) {
    return res.status(403).json({ message: "Колдонуучуларды көрүүгө укук жетишсиз." });
  }

  const db = readDb();
  const { status, roleCode } = req.query;
  let users = db.users;

  if (status) {
    users = users.filter((user) => user.status === status);
  }
  if (roleCode) {
    users = users.filter((user) => user.roleCode === roleCode);
  }

  res.json({ users: users.map(enrichUser) });
});

router.put("/:id", authenticate, (req, res) => {
  const db = readDb();
  const userIndex = db.users.findIndex((item) => item.id === req.params.id);

  if (userIndex === -1) {
    return res.status(404).json({ message: "Колдонуучу табылган жок." });
  }

  const target = db.users[userIndex];
  const isSelf = req.user.id === target.id;

  if (!isSelf && !canManageUsers(req.user)) {
    return res.status(403).json({ message: "Түзөтүүгө укук жетишсиз." });
  }

  const allowedFields = canManageUsers(req.user)
    ? ["fullName", "email", "phone", "position", "departmentId", "roleCode", "status"]
    : ["fullName", "email", "phone", "position"];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      target[field] = req.body[field];
    }
  });

  if (target.status === "active" && !target.approvedAt) {
    target.approvedAt = new Date().toISOString();
  }

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Колдонуучунун профили жаңыртылды",
    entityType: "user",
    entityId: target.id,
  });

  return res.json({ user: enrichUser(target) });
});

router.post("/:id/approve", authenticate, (req, res) => {
  if (!["ADMIN", "DIRECTOR"].includes(req.user.roleCode)) {
    return res.status(403).json({ message: "Тастыктоо администраторго же директорго гана жеткиликтүү." });
  }

  const db = readDb();
  const user = db.users.find((item) => item.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: "Колдонуучу табылган жок." });
  }

  user.status = "active";
  user.approvedAt = new Date().toISOString();
  db.notifications.unshift({
    id: createId("notif"),
    userId: user.id,
    title: "Аккаунт тастыкталды",
    text: "Системага кирүү мүмкүнчүлүгүңүз активдештирилди.",
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Жаңы колдонуучу тастыкталды",
    entityType: "user",
    entityId: user.id,
  });

  res.json({ user: enrichUser(user) });
});

router.delete("/:id", authenticate, (req, res) => {
  if (req.user.roleCode !== "ADMIN") {
    return res.status(403).json({ message: "Колдонуучуларды өчүрүү администраторго гана жеткиликтүү." });
  }

  if (req.user.id === req.params.id) {
    return res.status(400).json({ message: "Өз аккаунтуңузду өчүрүүгө болбойт." });
  }

  const db = readDb();
  const initialLength = db.users.length;
  db.users = db.users.filter((user) => user.id !== req.params.id);

  if (db.users.length === initialLength) {
    return res.status(404).json({ message: "Колдонуучу табылган жок." });
  }

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Колдонуучу өчүрүлдү",
    entityType: "user",
    entityId: req.params.id,
  });

  res.json({ message: "Колдонуучу өчүрүлдү." });
});

module.exports = router;
