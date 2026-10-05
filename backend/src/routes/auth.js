const express = require("express");
const { authenticate } = require("../middleware/auth");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");
const { hashPassword, comparePassword, signToken, sanitizeUser } = require("../utils/auth");
const { DEPARTMENTS, ROLES } = require("../utils/catalogs");

const router = express.Router();

function auditFailedLogin({ req, identifier, user, reason }) {
  appendAuditLog({
    userId: user?.id || "anonymous",
    action: "Неуспешная попытка входа",
    entityType: "auth",
    entityId: user?.id || identifier || "anonymous",
    req,
    metadata: {
      identifier: identifier || "",
      reason,
    },
  });
}

router.get("/me", authenticate, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

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

  if (String(password).length < 6) {
    return res.status(400).json({ message: "Сырсөз кеминде 6 белгиден турушу керек." });
  }

  const normalizedRoleCode = String(roleCode || "").trim();
  const normalizedDepartmentId = String(departmentId || "").trim();
  const allowedSelfRegistrationRoles = ROLES.map((role) => role.code).filter(
    (code) => !["ADMIN", "DIRECTOR"].includes(code)
  );

  if (!allowedSelfRegistrationRoles.includes(normalizedRoleCode)) {
    return res.status(400).json({ message: "Катталуу үчүн кызматкердин туура ролун тандаңыз." });
  }

  if (!DEPARTMENTS.some((department) => department.id === normalizedDepartmentId)) {
    return res.status(400).json({ message: "Туура бөлүмдү тандаңыз." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim();
  const normalizedFullName = String(fullName).trim();
  const normalizedPhone = String(phone).trim();
  const normalizedPosition = String(position).trim();

  if (!normalizedFullName || !normalizedEmail || !normalizedPhone || !normalizedPosition || !normalizedUsername) {
    return res.status(400).json({ message: "Бардык милдеттүү талааларды толтуруңуз." });
  }

  const db = readDb();
  const duplicateUser = db.users.find(
    (user) =>
      user.username.toLowerCase() === normalizedUsername.toLowerCase() ||
      user.email.toLowerCase() === normalizedEmail
  );

  if (duplicateUser) {
    return res.status(409).json({ message: "Логин же email мурунтан колдонулууда." });
  }

  const createdAt = new Date().toISOString();
  const user = {
    id: createId("user"),
    fullName: normalizedFullName,
    email: normalizedEmail,
    phone: normalizedPhone,
    position: normalizedPosition,
    departmentId: normalizedDepartmentId,
    roleCode: normalizedRoleCode,
    username: normalizedUsername,
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
      targetPath: "/admin",
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
    req,
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
    auditFailedLogin({
      req,
      identifier,
      reason: "missing_credentials",
    });
    return res.status(400).json({ message: "Логин/email жана сырсөздү жазыңыз." });
  }

  const db = readDb();
  const user = db.users.find(
    (item) => item.username.toLowerCase() === identifier || item.email.toLowerCase() === identifier
  );

  if (!user) {
    auditFailedLogin({
      req,
      identifier,
      reason: "user_not_found",
    });
    return res.status(401).json({ message: "Логин же сырсөз туура эмес." });
  }

  if (user.status !== "active") {
    auditFailedLogin({
      req,
      identifier,
      user,
      reason: `status_${user.status}`,
    });
    return res.status(403).json({ message: "Аккаунт али ырастала элек же бөгөттөлгөн." });
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    auditFailedLogin({
      req,
      identifier,
      user,
      reason: "invalid_password",
    });
    return res.status(401).json({ message: "Логин же сырсөз туура эмес." });
  }

  appendAuditLog({
    userId: user.id,
    action: "Тутумга кирди",
    entityType: "auth",
    entityId: user.id,
    req,
  });

  return res.json({
    token: signToken(user),
    user: sanitizeUser(user),
  });
});

router.post("/logout", authenticate, (req, res) => {
  appendAuditLog({
    userId: req.user.id,
    action: "Тутумдан чыкты",
    entityType: "auth",
    entityId: req.user.id,
    req,
  });

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
      targetPath: "/admin",
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    writeDb(db);
    appendAuditLog({
      userId: user.id,
      action: "Сырсөздү калыбына келтирүү суралды",
      entityType: "auth",
      entityId: user.id,
      req,
    });
  }

  res.json({
    message: "Эгер email табылса, администраторго калыбына келтирүү боюнча билдирме жөнөтүлөт.",
  });
});

module.exports = router;
