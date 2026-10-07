const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");
const { authenticate } = require("../middleware/auth");
const { comparePassword, hashPassword, sanitizeUser, signToken } = require("../utils/auth");
const { DEPARTMENTS, ROLES, getDepartmentTitle, getRoleTitle } = require("../utils/catalogs");
const { UPLOAD_DIR } = require("../utils/config");
const { removeUploadOnFailure } = require("../middleware/uploads");

const router = express.Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_ADMIN_PASSWORD_LENGTH = 8; // also used for self-service password changes

const AVATAR_UPLOAD_DIR = path.join(UPLOAD_DIR, "avatars");
const AVATAR_MIME_TYPES_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function canManageUsers(user) {
  return user.roleCode === "ADMIN";
}

function canApproveUsers(user) {
  return ["ADMIN", "DIRECTOR"].includes(user.roleCode);
}

function canViewUsers(user) {
  return ["ADMIN", "DIRECTOR", "HR"].includes(user.roleCode);
}

function enrichUser(user) {
  return {
    ...sanitizeUser(user),
    roleTitle: getRoleTitle(user.roleCode),
    departmentTitle: getDepartmentTitle(user.departmentId),
  };
}

function buildAvatarFileName(userId, originalName) {
  const extension = path.extname(originalName || "").toLowerCase();
  return `${userId}-${Date.now()}${extension}`;
}

function isAllowedAvatarFile(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  return AVATAR_MIME_TYPES_BY_EXTENSION[extension] === file.mimetype;
}

function getAvatarFileName(avatarPath) {
  const fileName = path.basename(String(avatarPath || ""));
  return fileName && fileName === String(avatarPath || "").split("/").pop() ? fileName : "";
}

function removePreviousAvatar(avatarPath, nextFileName) {
  const previousFileName = getAvatarFileName(avatarPath);
  if (!previousFileName || previousFileName === nextFileName) {
    return;
  }

  const previousPath = path.join(AVATAR_UPLOAD_DIR, previousFileName);
  try {
    if (previousPath.startsWith(AVATAR_UPLOAD_DIR) && fs.existsSync(previousPath)) {
      fs.unlinkSync(previousPath);
    }
  } catch (_error) {
    // The profile update should not fail if an old avatar cannot be removed.
  }
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
    cb(null, AVATAR_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, buildAvatarFileName(req.user.id, file.originalname));
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: (_req, file, cb) => {
    if (!isAllowedAvatarFile(file)) {
      cb(new Error("Можно загрузить только JPG, PNG или WEBP изображение."));
      return;
    }

    cb(null, true);
  },
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: enrichUser(req.user) });
});

router.get("/avatars/:fileName", (req, res) => {
  const fileName = path.basename(req.params.fileName || "");
  if (!fileName || fileName !== req.params.fileName) {
    return res.status(400).json({ message: "Некорректное имя файла." });
  }

  const extension = path.extname(fileName).toLowerCase();
  const mimeType = AVATAR_MIME_TYPES_BY_EXTENSION[extension];
  if (!mimeType) {
    return res.status(400).json({ message: "Некорректный формат изображения." });
  }

  const absolutePath = path.join(AVATAR_UPLOAD_DIR, fileName);
  if (!absolutePath.startsWith(AVATAR_UPLOAD_DIR) || !fs.existsSync(absolutePath)) {
    return res.status(404).json({ message: "Фото профиля не найдено." });
  }

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.sendFile(absolutePath);
});

function uploadCurrentUserAvatar(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "Выберите изображение профиля." });
  }

  const db = readDb();
  const user = db.users.find((item) => item.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: "Пользователь не найден." });
  }

  const previousAvatarPath = user.avatar || user.avatarPath;
  const avatarPath = `/api/users/avatars/${req.file.filename}`;
  user.avatar = avatarPath;
  user.avatarPath = avatarPath;
  user.avatarUpdatedAt = new Date().toISOString();

  writeDb(db);
  removePreviousAvatar(previousAvatarPath, req.file.filename);
  appendAuditLog({
    userId: req.user.id,
    action: "Фото профиля обновлено",
    entityType: "user",
    entityId: req.user.id,
    req,
  });

  return res.json({
    message: "Фото профиля обновлено.",
    user: enrichUser(user),
  });
}

router.post("/me/avatar", authenticate, removeUploadOnFailure, uploadAvatar.single("avatar"), uploadCurrentUserAvatar);
router.post("/avatar", authenticate, removeUploadOnFailure, uploadAvatar.single("avatar"), uploadCurrentUserAvatar);

router.get("/directory", authenticate, (_req, res) => {
  const db = readDb();
  const users = db.users
    .filter((user) => user.status === "active")
    .map((user) => ({
      id: user.id,
      fullName: user.fullName,
      avatar: user.avatar || user.avatarPath || "",
      avatarPath: user.avatar || user.avatarPath || "",
      roleTitle: getRoleTitle(user.roleCode),
      departmentTitle: getDepartmentTitle(user.departmentId),
    }));

  res.json({ users });
});

router.put("/me/password", authenticate, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Учурдагы жана жаңы сырсөздү толтуруңуз." });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Жаңы сырсөздөр дал келбейт." });
  }

  if (newPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return res.status(400).json({ message: `Жаңы сырсөз кеминде ${MIN_ADMIN_PASSWORD_LENGTH} белгиден турушу керек.` });
  }

  const db = readDb();
  const user = db.users.find((item) => item.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: "Колдонуучу табылган жок." });
  }

  const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    return res.status(401).json({ message: "Учурдагы сырсөз туура эмес." });
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date().toISOString();
  writeDb(db);

  appendAuditLog({
    userId: req.user.id,
    action: "Колдонуучу сырсөзүн өзгөрттү",
    entityType: "user",
    entityId: req.user.id,
    req,
  });

  // Other sessions are signed out; this one continues with a fresh token.
  res.json({ message: "Сырсөз жаңыртылды.", token: signToken(user) });
});

router.get("/", authenticate, (req, res) => {
  if (!canViewUsers(req.user)) {
    return res.status(403).json({ message: "Колдонуучуларды көрүүгө укук жетишсиз." });
  }

  const db = readDb();
  const { status, roleCode, departmentId } = req.query;
  const query = String(req.query.q || "").trim().toLowerCase();
  let users = db.users;

  if (status) {
    users = users.filter((user) => user.status === status);
  }
  if (roleCode) {
    users = users.filter((user) => user.roleCode === roleCode);
  }
  if (departmentId) {
    users = users.filter((user) => user.departmentId === departmentId);
  }
  if (query) {
    users = users.filter((user) =>
      [
        user.fullName,
        user.email,
        user.username,
        user.phone,
        user.position,
        user.roleCode,
        getRoleTitle(user.roleCode),
        user.departmentId,
        getDepartmentTitle(user.departmentId),
        user.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  users = [...users].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "pending" ? -1 : 1;
    }

    return a.fullName.localeCompare(b.fullName);
  });

  res.json({ users: users.map(enrichUser) });
});

// Administrator creates an account directly (any role, active right away, no approval step).
router.post("/", authenticate, async (req, res) => {
  if (!canManageUsers(req.user)) {
    return res.status(403).json({ message: "Колдонуучуну администратор гана түзө алат." });
  }

  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const phone = String(req.body.phone || "").trim();
  const position = String(req.body.position || "").trim();
  const roleCode = String(req.body.roleCode || "").trim();
  const departmentId = String(req.body.departmentId || "").trim();
  const status = String(req.body.status || "active").trim();

  if (!fullName || !email || !username || !password || !roleCode || !departmentId) {
    return res.status(400).json({ message: "Аты-жөнү, email, логин, сырсөз, ролу жана бөлүмү милдеттүү." });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: "Email туура эмес жазылган." });
  }
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
    return res.status(400).json({ message: "Логин 3–40 белгиден турушу керек: латын тамгалары, сандар, . _ -" });
  }
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return res.status(400).json({ message: `Сырсөз кеминде ${MIN_ADMIN_PASSWORD_LENGTH} белгиден турушу керек.` });
  }
  if (!ROLES.some((role) => role.code === roleCode)) {
    return res.status(400).json({ message: "Туура ролду тандаңыз." });
  }
  if (!DEPARTMENTS.some((department) => department.id === departmentId)) {
    return res.status(400).json({ message: "Туура бөлүмдү тандаңыз." });
  }
  if (!["active", "pending", "blocked"].includes(status)) {
    return res.status(400).json({ message: "Туура абалды тандаңыз." });
  }

  const passwordHash = await hashPassword(password);
  const db = readDb();
  if (db.users.some((item) => item.email.toLowerCase() === email)) {
    return res.status(409).json({ message: "Бул email мурун катталган." });
  }
  if (db.users.some((item) => item.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ message: "Бул логин мурун катталган." });
  }

  const createdAt = new Date().toISOString();
  const newUser = {
    id: createId("user"),
    fullName,
    email,
    phone,
    username,
    passwordHash,
    position,
    departmentId,
    roleCode,
    status,
    createdAt,
    approvedAt: status === "active" ? createdAt : null,
    createdBy: req.user.id,
  };

  db.users.unshift(newUser);
  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Администратор жаңы колдонуучу түздү",
    entityType: "user",
    entityId: newUser.id,
    req,
    metadata: { username, roleCode, departmentId },
  });

  return res.status(201).json({ user: enrichUser(newUser) });
});

router.put("/:id", authenticate, async (req, res) => {
  const db = readDb();
  const userIndex = db.users.findIndex((item) => item.id === req.params.id);

  if (userIndex === -1) {
    return res.status(404).json({ message: "Колдонуучу табылган жок." });
  }

  const target = db.users[userIndex];
  const isSelf = req.user.id === target.id;

  if (!isSelf && !canViewUsers(req.user)) {
    return res.status(403).json({ message: "Түзөтүүгө укук жетишсиз." });
  }

  if (!isSelf && req.user.roleCode === "DIRECTOR") {
    return res.status(403).json({ message: "Директор жаңы аккаунттарды тастыктай алат, бирок колдонуучунун профилин администратор өзгөртөт." });
  }

  if (req.user.roleCode === "HR" && ["ADMIN", "DIRECTOR"].includes(target.roleCode)) {
    return res.status(403).json({ message: "Жетекчилик жана администратор аккаунттарын өзгөртүүгө укук жетишсиз." });
  }

  if (isSelf && req.body.status !== undefined && req.body.status !== "active") {
    return res.status(400).json({ message: "Өз аккаунтуңузду бөгөттөөгө болбойт." });
  }

  if (isSelf && req.body.roleCode !== undefined && req.body.roleCode !== target.roleCode) {
    return res.status(400).json({ message: "Өз ролуңузду өзгөртүүгө болбойт." });
  }

  if (!canManageUsers(req.user) && ["username", "roleCode", "status"].some((field) => req.body[field] !== undefined)) {
    return res.status(403).json({ message: "Логинди, ролду жана аккаунт абалын администратор же директор гана өзгөртө алат." });
  }

  const allowedFields = canManageUsers(req.user)
    ? ["fullName", "email", "phone", "username", "position", "departmentId", "roleCode", "status"]
    : req.user.roleCode === "HR"
    ? ["fullName", "email", "phone", "position", "departmentId"]
    : ["fullName", "email", "phone", "position"];

  if (allowedFields.includes("email") && req.body.email !== undefined) {
    const email = String(req.body.email).trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email милдеттүү." });
    }
    const emailTaken = db.users.some((item) => item.id !== target.id && item.email === email);
    if (emailTaken) {
      return res.status(409).json({ message: "Бул email мурун катталган." });
    }
    target.email = email;
  }

  if (allowedFields.includes("username") && req.body.username !== undefined) {
    const username = String(req.body.username).trim();
    if (!username) {
      return res.status(400).json({ message: "Логин милдеттүү." });
    }
    const usernameTaken = db.users.some(
      (item) => item.id !== target.id && item.username.toLowerCase() === username.toLowerCase()
    );
    if (usernameTaken) {
      return res.status(409).json({ message: "Бул логин мурун катталган." });
    }
    target.username = username;
  }

  if (req.body.roleCode !== undefined && !ROLES.some((role) => role.code === req.body.roleCode)) {
    return res.status(400).json({ message: "Туура ролду тандаңыз." });
  }
  if (
    req.body.departmentId !== undefined &&
    !DEPARTMENTS.some((department) => department.id === req.body.departmentId)
  ) {
    return res.status(400).json({ message: "Туура бөлүмдү тандаңыз." });
  }
  if (req.body.status !== undefined && !["active", "pending", "blocked"].includes(req.body.status)) {
    return res.status(400).json({ message: "Туура абалды тандаңыз." });
  }

  allowedFields
    .filter((field) => !["email", "username"].includes(field))
    .forEach((field) => {
      if (req.body[field] !== undefined) {
        target[field] = req.body[field];
      }
    });

  if (req.body.password !== undefined && String(req.body.password).trim()) {
    if (req.user.roleCode !== "ADMIN") {
      return res.status(403).json({ message: "Сырсөздү администратор гана өзгөртө алат." });
    }

    const password = String(req.body.password).trim();
    if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Сырсөз кеминде ${MIN_ADMIN_PASSWORD_LENGTH} белгиден турушу керек.` });
    }
    target.passwordHash = await hashPassword(password);
    target.passwordChangedAt = new Date().toISOString();
  }

  if (target.status === "active" && !target.approvedAt) {
    target.approvedAt = new Date().toISOString();
  }

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Колдонуучунун профили жаңыртылды",
    entityType: "user",
    entityId: target.id,
    req,
  });

  return res.json({ user: enrichUser(target) });
});

function approveUser(req, res) {
  if (!canApproveUsers(req.user)) {
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
    targetPath: "/profile",
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Жаңы колдонуучу тастыкталды",
    entityType: "user",
    entityId: user.id,
    req,
  });

  res.json({ user: enrichUser(user) });
}

router.post("/:id/approve", authenticate, approveUser);
router.patch("/:id/approve", authenticate, approveUser);

router.patch("/:id/role", authenticate, (req, res) => {
  if (!canManageUsers(req.user)) {
    return res.status(403).json({ message: "Ролду администратор гана өзгөртө алат." });
  }

  if (req.user.id === req.params.id) {
    return res.status(400).json({ message: "Өз ролуңузду өзгөртүүгө болбойт." });
  }

  const roleCode = String(req.body.roleCode || req.body.role || "").trim();
  if (!ROLES.some((role) => role.code === roleCode)) {
    return res.status(400).json({ message: "Туура ролду тандаңыз." });
  }

  const db = readDb();
  const user = db.users.find((item) => item.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: "Колдонуучу табылган жок." });
  }

  user.roleCode = roleCode;
  user.updatedAt = new Date().toISOString();
  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Колдонуучунун ролу өзгөртүлдү",
    entityType: "user",
    entityId: user.id,
    req,
    metadata: { roleCode },
  });

  res.json({ user: enrichUser(user) });
});

router.post("/:id/reject", authenticate, (req, res) => {
  if (!canApproveUsers(req.user)) {
    return res.status(403).json({ message: "Катталууну четке кагуу администраторго же директорго гана жеткиликтүү." });
  }

  if (req.user.id === req.params.id) {
    return res.status(400).json({ message: "Өз аккаунтуңузду четке кагууга болбойт." });
  }

  const db = readDb();
  const user = db.users.find((item) => item.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: "Колдонуучу табылган жок." });
  }

  if (user.status !== "pending") {
    return res.status(400).json({ message: "Тастыктоону күтүп жаткан аккаунтту гана четке кагууга болот." });
  }

  user.status = "blocked";
  user.rejectedAt = new Date().toISOString();
  user.rejectedBy = req.user.id;
  user.rejectionReason = String(req.body.reason || "").trim();

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Жаңы колдонуучу четке кагылды",
    entityType: "user",
    entityId: user.id,
    req,
    metadata: {
      reason: user.rejectionReason,
    },
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
    req,
  });

  res.json({ message: "Колдонуучу өчүрүлдү." });
});

router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Фото профиля должно быть не больше 3 МБ."
      : "Не удалось загрузить фото профиля.";
    return res.status(400).json({ message });
  }

  if (error?.message === "Можно загрузить только JPG, PNG или WEBP изображение.") {
    return res.status(400).json({ message: error.message });
  }

  return next(error);
});

module.exports = router;
