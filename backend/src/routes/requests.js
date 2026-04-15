const express = require("express");
const multer = require("multer");
const path = require("path");
const { authenticate } = require("../middleware/auth");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");
const { UPLOAD_DIR } = require("../utils/config");
const { getRoleTitle, normalizeRequestStatus } = require("../utils/catalogs");
const { generateOfficialRequestPdf } = require("../utils/officialPdf");

const router = express.Router();

const STATUS_DRAFT = "Долбоор";
const STATUS_DIRECTOR_REVIEW = "Директор карап жатат";
const STATUS_DIRECTOR_SIGNED = "Директор кол койду";
const STATUS_TO_HR = "Кадрлар бөлүмүнө жөнөтүлдү";
const STATUS_TO_ACCOUNTING = "Бухгалтерияга жөнөтүлдү";
const STATUS_RETURNED = "Окутуучуга кайтарылды";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];

function buildSafeFileName(originalName) {
  const extension = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, extension);
  const safeBaseName = baseName
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${Date.now()}-${safeBaseName || "document"}${extension}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    cb(null, buildSafeFileName(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      cb(new Error("PDF, Word жана Excel файлдары гана уруксат берилет."));
      return;
    }

    cb(null, true);
  },
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

function normalizeRequest(request, users) {
  const normalizedStatus = normalizeRequestStatus(request.status || STATUS_DIRECTOR_REVIEW);
  const currentRecipientRole =
    request.currentRecipientRole ||
    (normalizedStatus === STATUS_TO_HR
      ? "HR"
      : normalizedStatus === STATUS_TO_ACCOUNTING
        ? "ACCOUNTANT"
        : normalizedStatus === STATUS_RETURNED || normalizedStatus === STATUS_DRAFT
          ? "TEACHER"
          : "DIRECTOR");

  const currentRecipientUser =
    currentRecipientRole === "TEACHER"
      ? users.find((user) => user.id === request.userId)
      : users.find((user) => user.roleCode === currentRecipientRole);

  return {
    ...request,
    status: normalizedStatus,
    type: request.type || "Окутуучунун кайрылуусу",
    documentTitle: request.documentTitle || request.type || "Кызматтык кайрылуу",
    initialRecipientRole: request.initialRecipientRole || "DIRECTOR",
    currentRecipientRole,
    currentRecipientTitle: getRoleTitle(currentRecipientRole),
    currentRecipientUserId: currentRecipientUser?.id || null,
    directorSignature: request.directorSignature || null,
    officialDocument: request.officialDocument || null,
    isOfficial: Boolean(request.isOfficial || request.officialDocument),
    attachment: request.attachment || null,
    routeHistory: Array.isArray(request.routeHistory)
      ? request.routeHistory.map((step) => ({
          ...step,
          status: normalizeRequestStatus(step.status),
          actorRoleTitle: getRoleTitle(step.actorRoleCode),
          targetRoleTitle: getRoleTitle(step.targetRoleCode),
        }))
      : [],
  };
}

function decorateRequest(request, users) {
  const normalizedRequest = normalizeRequest(request, users);
  const author = users.find((user) => user.id === normalizedRequest.userId);

  return {
    ...normalizedRequest,
    authorName: author?.fullName || "Белгисиз",
    authorRoleCode: author?.roleCode || null,
    authorRoleTitle: author ? getRoleTitle(author.roleCode) : null,
  };
}

function canViewRequest(user, request) {
  if (request.userId === user.id) {
    return true;
  }

  if (["DIRECTOR", "ADMIN"].includes(user.roleCode)) {
    return true;
  }

  return request.currentRecipientRole === user.roleCode;
}

function parseSubmittedStatus(status) {
  const normalizedStatus = normalizeRequestStatus(status);
  return normalizedStatus === STATUS_DRAFT ? STATUS_DRAFT : STATUS_DIRECTOR_REVIEW;
}

function buildRouteStep({ actor, status, targetRoleCode, comment, signatureName }) {
  return {
    id: createId("route"),
    actorUserId: actor.id,
    actorName: actor.fullName,
    actorRoleCode: actor.roleCode,
    actorRoleTitle: getRoleTitle(actor.roleCode),
    status: normalizeRequestStatus(status),
    targetRoleCode,
    targetRoleTitle: getRoleTitle(targetRoleCode),
    comment: comment || "",
    signatureName: signatureName || "",
    createdAt: new Date().toISOString(),
  };
}

function notifyUsers(db, userIds, title, text, createdAt) {
  userIds.forEach((userId) => {
    db.notifications.unshift({
      id: createId("notif"),
      userId,
      title,
      text,
      isRead: false,
      createdAt,
    });
  });
}

function upsertOfficialDocument(db, request, director, officialDocument, now) {
  db.documents = db.documents.filter((item) => item.sourceRequestId !== request.id);
  db.documents.unshift({
    id: createId("doc"),
    title: request.documentTitle,
    filePath: officialDocument.filePath,
    uploadedBy: director.id,
    category: "Официальный подписанный документ",
    createdAt: now,
    sourceRequestId: request.id,
  });
}

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  const decoratedRequests = db.requests.map((request) => decorateRequest(request, db.users));
  let requests = decoratedRequests;

  if (req.user.roleCode === "TEACHER") {
    requests = decoratedRequests.filter((request) => request.userId === req.user.id);
  } else if (req.user.roleCode === "HR" || req.user.roleCode === "ACCOUNTANT") {
    requests = decoratedRequests.filter((request) => request.currentRecipientRole === req.user.roleCode);
  } else if (req.user.roleCode === "ACADEMIC_OFFICE") {
    requests = decoratedRequests.filter((request) => request.currentRecipientRole === "ACADEMIC_OFFICE");
  } else if (req.user.roleCode === "DIRECTOR") {
    requests = decoratedRequests.filter(
      (request) =>
        request.currentRecipientRole === "DIRECTOR" ||
        request.routeHistory.some((step) => step.actorUserId === req.user.id)
    );
  }

  requests.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  res.json({ requests });
});

router.post("/", authenticate, upload.single("attachment"), (req, res) => {
  if (!["TEACHER", "ADMIN"].includes(req.user.roleCode)) {
    return res.status(403).json({ message: "Кайрылууну түзүү окутуучуга гана жеткиликтүү." });
  }

  const { type, reason, comment, startDate, endDate, absenceTime, status, documentTitle } = req.body;
  const normalizedType = String(type || "").trim();
  const normalizedReason = String(reason || "").trim();
  const normalizedComment = String(comment || "").trim();
  const normalizedDocumentTitle = String(documentTitle || "").trim();
  const normalizedAbsenceTime = String(absenceTime || "").trim();

  const missingFields = [];
  if (!normalizedType) {
    missingFields.push("кайрылуунун түрү");
  }
  if (!normalizedDocumentTitle) {
    missingFields.push("документтин аталышы");
  }
  if (!normalizedReason) {
    missingFields.push("кайрылуунун мазмуну");
  }

  if (missingFields.length) {
    return res.status(400).json({ message: `Талааларды толтуруңуз: ${missingFields.join(", ")}.` });
  }

  if (startDate && endDate && endDate < startDate) {
    return res.status(400).json({ message: "Аяктоо күнү башталыш күндөн эрте боло албайт." });
  }

  const db = readDb();
  const createdAt = new Date().toISOString();
  const parsedStatus = parseSubmittedStatus(status);
  const routeHistory = [
    buildRouteStep({
      actor: req.user,
      status: parsedStatus,
      targetRoleCode: parsedStatus === STATUS_DRAFT ? "TEACHER" : "DIRECTOR",
      comment: normalizedComment,
    }),
  ];

  const request = {
    id: createId("req"),
    userId: req.user.id,
    type: normalizedType,
    documentTitle: normalizedDocumentTitle,
    reason: normalizedReason,
    comment: normalizedComment,
    startDate: startDate || createdAt.slice(0, 10),
    endDate: endDate || startDate || createdAt.slice(0, 10),
    absenceTime: normalizedAbsenceTime || "Толук күн",
    status: parsedStatus,
    initialRecipientRole: "DIRECTOR",
    currentRecipientRole: parsedStatus === STATUS_DRAFT ? "TEACHER" : "DIRECTOR",
    directorComment: "",
    directorSignature: null,
    officialDocument: null,
    isOfficial: false,
    attachment: req.file
      ? {
          fileName: req.file.originalname,
          filePath: `/uploads/${req.file.filename}`,
          mimeType: req.file.mimetype,
          size: req.file.size,
        }
      : null,
    routeHistory,
    createdAt,
    updatedAt: createdAt,
  };

  db.requests.unshift(request);

  if (request.status !== STATUS_DRAFT) {
    const directorIds = db.users
      .filter((user) => ["DIRECTOR", "ADMIN"].includes(user.roleCode))
      .map((user) => user.id);

    notifyUsers(
      db,
      directorIds,
      "Окутуучудан жаңы кайрылуу",
      `${req.user.fullName} "${request.documentTitle}" документин директорго жөнөттү.`,
      createdAt
    );
  }

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Окутуучунун кайрылуусу түзүлдү",
    entityType: "request",
    entityId: request.id,
  });

  res.status(201).json({ request: decorateRequest(request, db.users) });
});

router.get("/:id", authenticate, (req, res) => {
  const db = readDb();
  const rawRequest = db.requests.find((item) => item.id === req.params.id);

  if (!rawRequest) {
    return res.status(404).json({ message: "Кайрылуу табылган жок." });
  }

  const request = decorateRequest(rawRequest, db.users);

  if (!canViewRequest(req.user, request)) {
    return res.status(403).json({ message: "Укук жетишсиз." });
  }

  res.json({ request });
});

router.put("/:id/status", authenticate, async (req, res) => {
  try {
    if (!["DIRECTOR", "ADMIN"].includes(req.user.roleCode)) {
      return res.status(403).json({ message: "Маршруттоо директорго гана жеткиликтүү." });
    }

    const { status, directorComment, nextRoleCode, signatureName } = req.body;
    const db = readDb();
    const requestIndex = db.requests.findIndex((item) => item.id === req.params.id);

    if (requestIndex === -1) {
      return res.status(404).json({ message: "Кайрылуу табылган жок." });
    }

    const request = normalizeRequest(db.requests[requestIndex], db.users);
    if (request.currentRecipientRole !== "DIRECTOR") {
      return res.status(400).json({ message: "Бул документ директордун кароосун күтүп жаткан жок." });
    }

    const normalizedStatus = normalizeRequestStatus(status);
    const isApprovalAction = normalizedStatus === STATUS_DIRECTOR_SIGNED || nextRoleCode === "DIRECTOR";
    const now = new Date().toISOString();

    if (isApprovalAction) {
      const author = db.users.find((user) => user.id === request.userId);
      const director = db.users.find((user) => user.id === req.user.id);

      request.status = STATUS_DIRECTOR_SIGNED;
      request.currentRecipientRole = "DIRECTOR";
      request.directorComment = directorComment ?? request.directorComment;
      request.updatedAt = now;

      const { signatureCode, document } = await generateOfficialRequestPdf({
        request: {
          ...request,
          updatedAt: now,
          directorComment: directorComment ?? request.directorComment,
        },
        author,
        director,
        targetRoleTitle: getRoleTitle("DIRECTOR"),
      });

      request.directorSignature = {
        signedBy: signatureName || req.user.fullName,
        signedAt: now,
        signerRoleTitle: getRoleTitle(req.user.roleCode),
        signatureCode,
        type: "EDS",
      };
      request.officialDocument = document;
      request.isOfficial = true;
      request.routeHistory = [
        ...request.routeHistory,
        buildRouteStep({
          actor: req.user,
          status: STATUS_DIRECTOR_SIGNED,
          targetRoleCode: "DIRECTOR",
          comment: directorComment,
          signatureName: signatureName || req.user.fullName,
        }),
      ];

      db.requests[requestIndex] = request;
      upsertOfficialDocument(db, request, req.user, document, now);

      notifyUsers(
        db,
        [request.userId],
        "Документ расмий болуп бекитилди",
        `"${request.documentTitle}" документи директор тарабынан ЭЦП менен бекитилип, расмий PDF түзүлдү.`,
        now
      );

      writeDb(db);
      appendAuditLog({
        userId: req.user.id,
        action: "Документ ЭЦП менен бекитилип, расмий PDF түзүлдү",
        entityType: "request",
        entityId: request.id,
      });

      return res.json({ request: decorateRequest(request, db.users) });
    }

    if (!request.isOfficial || !request.directorSignature || !request.officialDocument) {
      return res.status(400).json({ message: "Адегенде документти «Одобрить» баскычы менен расмий бекитиңиз." });
    }

    let resolvedTargetRole = nextRoleCode;
    if (!resolvedTargetRole) {
      resolvedTargetRole =
        normalizedStatus === STATUS_TO_HR
          ? "HR"
          : normalizedStatus === STATUS_TO_ACCOUNTING
            ? "ACCOUNTANT"
            : "TEACHER";
    }

    const allowedTargets = ["HR", "ACCOUNTANT", "TEACHER"];
    if (!allowedTargets.includes(resolvedTargetRole)) {
      return res.status(400).json({ message: "Документтин туура маршрутун көрсөтүңүз." });
    }

    const resolvedStatus =
      normalizedStatus ||
      (resolvedTargetRole === "HR"
        ? STATUS_TO_HR
        : resolvedTargetRole === "ACCOUNTANT"
          ? STATUS_TO_ACCOUNTING
          : STATUS_RETURNED);

    request.status = resolvedStatus;
    request.currentRecipientRole = resolvedTargetRole;
    request.directorComment = directorComment ?? request.directorComment;
    request.updatedAt = now;
    request.routeHistory = [
      ...request.routeHistory,
      buildRouteStep({
        actor: req.user,
        status: resolvedStatus,
        targetRoleCode: resolvedTargetRole,
        comment: directorComment,
        signatureName: signatureName || req.user.fullName,
      }),
    ];

    db.requests[requestIndex] = request;

    const targetUserIds =
      resolvedTargetRole === "TEACHER"
        ? [request.userId]
        : db.users.filter((user) => user.roleCode === resolvedTargetRole).map((user) => user.id);

    notifyUsers(
      db,
      targetUserIds,
      "Расмий документ келип түштү",
      `Директор "${request.documentTitle}" документин "${getRoleTitle(resolvedTargetRole)}" бөлүмүнө жөнөттү.`,
      now
    );

    if (resolvedTargetRole !== "TEACHER") {
      notifyUsers(
        db,
        [request.userId],
        "Документ жөнөтүлдү",
        `"${request.documentTitle}" расмий документи "${getRoleTitle(resolvedTargetRole)}" бөлүмүнө жөнөтүлдү.`,
        now
      );
    }

    writeDb(db);
    appendAuditLog({
      userId: req.user.id,
      action: `Расмий документ "${getRoleTitle(resolvedTargetRole)}" бөлүмүнө жөнөтүлдү`,
      entityType: "request",
      entityId: request.id,
    });

    return res.json({ request: decorateRequest(request, db.users) });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Кайрылууну иштетүүдө ката кетти." });
  }
});

router.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: "Кайрылуунун файлын жүктөө мүмкүн болгон жок." });
  }

  if (error) {
    return res.status(400).json({ message: error.message || "Кайрылууну иштетүүдө ката кетти." });
  }

  return res.status(500).json({ message: "Ички сервердик ката." });
});

module.exports = router;
