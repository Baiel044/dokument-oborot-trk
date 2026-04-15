const express = require("express");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");
const { hashPassword, comparePassword, signToken, sanitizeUser } = require("../utils/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  const {
    fullName,
    email,
    phone,
    position,
    departmentId,
    roleCode,
    username,
    password,
    confirmPassword,
  } = req.body;

  if (
    !fullName ||
    !email ||
    !phone ||
    !position ||
    !departmentId ||
    !roleCode ||
    !username ||
    !password ||
    !confirmPassword
  ) {
    return res.status(400).json({ message: "Бардык милдеттүү талааларды толтуруңуз." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Сырсөздөр дал келбейт." });
  }

  const db = readDb();
  const duplicateUser = db.users.find(
    (user) => user.username.toLowerCase() === username.toLowerCase() || user.email.toLowerCase() === email.toLowerCase()
  );

  if (duplicateUser) {
    return res.status(409).json({ message: "Логин же email мурунтан колдонулууда." });
  }

  const createdAt = new Date().toISOString();
  const user = {
    id: createId("user"),
    fullName,
    email,
    phone,
    position,
    departmentId,
    roleCode,
    username,
    passwordHash: await hashPassword(password),
    status: "pending",
    createdAt,
  };

  db.users.unshift(user);

  const approvers = db.users.filter((item) => ["ADMIN", "DIRECTOR"].includes(item.roleCode));
  approvers.forEach((item) => {
    db.notifications.unshift({
      id: createId("notif"),
      userId: item.id,
      title: "Жаңы катталуу",
      text: `${fullName} аккаунт ырастоону күтүп жатат.`,
      isRead: false,
      createdAt,
    });
  });

  writeDb(db);
  appendAuditLog({
    userId: user.id,
    action: "Катталуу арызы түзүлдү",
    entityType: "user",
    entityId: user.id,
  });

  return res.status(201).json({
    message: "Катталуу арызы администраторго же директорго жөнөтүлдү.",
    user: sanitizeUser(user),
  });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const identifier = String(username || "").trim().toLowerCase();

  if (!identifier || !password) {
    return res.status(400).json({ message: "Логин/email жана сырсөздү жазыңыз." });
  }

  const db = readDb();
  const user = db.users.find(
    (item) => item.username.toLowerCase() === identifier || item.email.toLowerCase() === identifier
  );

  if (!user) {
    return res.status(401).json({ message: "Логин же сырсөз туура эмес." });
  }

  if (user.status !== "active") {
    return res.status(403).json({ message: "Аккаунт али ырастала элек же бөгөттөлгөн." });
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Логин же сырсөз туура эмес." });
  }

  appendAuditLog({
    userId: user.id,
    action: "Тутумга кирди",
    entityType: "auth",
    entityId: user.id,
  });

  return res.json({
    token: signToken(user),
    user: sanitizeUser(user),
  });
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Сеанс аяктады." });
});

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  const db = readDb();
  const user = db.users.find((item) => item.email.toLowerCase() === String(email || "").toLowerCase());

  if (user) {
    db.notifications.unshift({
      id: createId("notif"),
      userId: "user-admin",
      title: "Сырсөздү калыбына келтирүү өтүнүчү",
      text: `${user.fullName} сырсөздү калыбына келтирүүнү сурады.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    writeDb(db);
    appendAuditLog({
      userId: user.id,
      action: "Сырсөздү калыбына келтирүү суралды",
      entityType: "auth",
      entityId: user.id,
    });
  }

  res.json({
    message: "Эгер email табылса, администраторго калыбына келтирүү боюнча билдирме жөнөтүлөт.",
  });
});

module.exports = router;
