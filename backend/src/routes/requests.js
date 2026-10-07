const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { authenticate } = require("../middleware/auth");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");
const { UPLOAD_DIR } = require("../utils/config");
const { removeUploadOnFailure } = require("../middleware/uploads");
const { getRoleTitle, normalizeRequestStatus } = require("../utils/catalogs");
const { generateOfficialRequestPdf } = require("../utils/officialPdf");
const { getOrCreateDocumentNumber } = require("../utils/documentNumbering");
const { DOCUMENT_EXTENSIONS, isAllowedDocumentFile } = require("../utils/uploadValidation");

const router = express.Router();

const STATUS_DRAFT = "Долбоор";
const STATUS_DIRECTOR_REVIEW = "Директор карап жатат";
const STATUS_DIRECTOR_SIGNED = "Директор кол койду";
const STATUS_TO_ACADEMIC_OFFICE = "Окуу бөлүмүнө жөнөтүлдү";
const STATUS_TO_HR = "Кадрлар бөлүмүнө жөнөтүлдү";
const STATUS_TO_ACCOUNTING = "Бухгалтерияга жөнөтүлдү";
const STATUS_RETURNED = "Окутуучуга кайтарылды";
const STATUS_REJECTED = "Четке кагылды";
const STATUS_COMPLETED = "Аткарылды";

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
    if (!DOCUMENT_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase()) || !isAllowedDocumentFile(file)) {
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
    (normalizedStatus === STATUS_TO_ACADEMIC_OFFICE
      ? "ACADEMIC_OFFICE"
      : normalizedStatus === STATUS_TO_HR
      ? "HR"
      : normalizedStatus === STATUS_TO_ACCOUNTING
        ? "ACCOUNTANT"
        : normalizedStatus === STATUS_COMPLETED || normalizedStatus === STATUS_REJECTED
          ? null
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
    currentRecipientTitle: currentRecipientRole ? getRoleTitle(currentRecipientRole) : null,
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

function textValue(value) {
  return String(value || "").toLowerCase();
}

function routeHistoryText(routeHistory) {
  return (routeHistory || [])
    .flatMap((step) => [
      step.actorName,
      step.actorRoleCode,
      step.actorRoleTitle,
      step.targetRoleCode,
      step.targetRoleTitle,
      step.status,
      step.comment,
      step.signatureName,
    ])
    .join(" ");
}

function matchesDateFilter(request, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) {
    return true;
  }

  const requestTime = new Date(request.updatedAt || request.createdAt).getTime();
  if (Number.isNaN(requestTime)) {
    return false;
  }

  if (dateFrom) {
    const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
    if (!Number.isNaN(fromTime) && requestTime < fromTime) {
      return false;
    }
  }

  if (dateTo) {
    const toTime = new Date(`${dateTo}T23:59:59`).getTime();
    if (!Number.isNaN(toTime) && requestTime > toTime) {
      return false;
    }
  }

  return true;
}

function applyRequestFilters(requests, query) {
  const status = String(query.status || "").trim();
  const normalizedStatus = status ? normalizeRequestStatus(status) : "";
  const type = String(query.type || "").trim();
  const recipientRole = String(query.recipientRole || "").trim();
  const official = String(query.official || "").trim();
  const search = String(query.q || "").trim().toLowerCase();
  const dateFrom = String(query.dateFrom || "").trim();
  const dateTo = String(query.dateTo || "").trim();

  return requests.filter((request) => {
    if (normalizedStatus && request.status !== normalizedStatus) {
      return false;
    }

    if (type && request.type !== type) {
      return false;
    }

    if (recipientRole && request.currentRecipientRole !== recipientRole) {
      return false;
    }

    if (official === "true" && !request.isOfficial) {
      return false;
    }

    if (official === "false" && request.isOfficial) {
      return false;
    }

    if (!matchesDateFilter(request, dateFrom, dateTo)) {
      return false;
    }

    if (!search) {
      return true;
    }

    const searchableText = [
      request.documentTitle,
      request.type,
      request.reason,
      request.comment,
      request.status,
      request.authorName,
      request.authorRoleTitle,
      request.currentRecipientRole,
      request.currentRecipientTitle,
      request.directorComment,
      request.completedComment,
      request.attachment?.fileName,
      request.officialDocument?.fileName,
      request.officialDocument?.originalTitle,
      routeHistoryText(request.routeHistory),
    ]
      .map(textValue)
      .join(" ");

    return searchableText.includes(search);
  });
}

function canViewRequest(user, request) {
  if (request.userId === user.id) {
    return true;
  }

  if (["DIRECTOR", "ADMIN"].includes(user.roleCode)) {
    return true;
  }

  if (request.currentRecipientRole === user.roleCode) {
    return true;
  }

  return request.routeHistory.some(
    (step) => step.actorUserId === user.id || step.targetRoleCode === user.roleCode
  );
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

function notifyUsers(db, userIds, title, text, createdAt, targetPath = "/requests") {
  userIds.filter(Boolean).forEach((userId) => {
    db.notifications.unshift({
      id: createId("notif"),
      userId,
      title,
      text,
      targetPath,
      isRead: false,
      createdAt,
    });
  });
}

function getRequestTargetPath(requestId) {
  return `/requests?request=${encodeURIComponent(requestId)}`;
}

function upsertOfficialDocument(db, request, director, officialDocument, now) {
  const existingDocument = db.documents.find((item) => item.sourceRequestId === request.id);
  const numberInfo = getOrCreateDocumentNumber(db, "statements", existingDocument || officialDocument);

  db.documents = db.documents.filter((item) => item.sourceRequestId !== request.id);
  db.documents.unshift({
    id: createId("doc"),
    ...numberInfo,
    title: request.documentTitle,
    filePath: officialDocument.filePath,
    fileName: officialDocument.originalTitle || officialDocument.fileName,
    uploadedBy: director.id,
    category: "statements",
    description: request.reason,
    createdAt: now,
    updatedAt: now,
    sourceRequestId: request.id,
    isOfficial: true,
    status: "approved",
    approvedBy: director.id,
    approvedAt: now,
    digitalSignature: {
      signedBy: request.directorSignature?.signedBy || director.fullName,
      signedByUserId: director.id,
      signedByRole: director.roleCode,
      signedAt: request.directorSignature?.signedAt || now,
      verificationMethod: request.directorSignature?.type || "EDS",
    },
    officialDocument: {
      fileName: officialDocument.fileName,
      filePath: officialDocument.filePath,
      originalTitle: officialDocument.originalTitle,
      mimeType: officialDocument.mimeType,
      generatedAt: officialDocument.generatedAt,
      documentNumber: numberInfo.documentNumber,
    },
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

  requests = applyRequestFilters(requests, req.query);
  requests.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  res.json({ requests });
});

router.post("/", authenticate, removeUploadOnFailure, upload.single("attachment"), (req, res) => {
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
      createdAt,
      getRequestTargetPath(request.id)
    );
  }

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Окутуучунун кайрылуусу түзүлдү",
    entityType: "request",
    entityId: request.id,
    req,
  });

  res.status(201).json({ request: decorateRequest(request, db.users) });
});

// Checks edit rights before multer stores anything on disk.
function requireRequestEditPermission(req, res, next) {
  const db = readDb();
  const request = db.requests.find((item) => item.id === req.params.id);
  if (!request) {
    return res.status(404).json({ message: "Кайрылуу табылган жок." });
  }
  if (request.userId !== req.user.id && req.user.roleCode !== "ADMIN") {
    return res.status(403).json({ message: "Бул кайрылууну түзөтүүгө укук жетишсиз." });
  }
  return next();
}

router.put("/:id", authenticate, requireRequestEditPermission, removeUploadOnFailure, upload.single("attachment"), (req, res) => {
  const db = readDb();
  const requestIndex = db.requests.findIndex((item) => item.id === req.params.id);

  if (requestIndex === -1) {
    return res.status(404).json({ message: "Кайрылуу табылган жок." });
  }

  const request = normalizeRequest(db.requests[requestIndex], db.users);
  const canEdit = request.userId === req.user.id || req.user.roleCode === "ADMIN";

  if (!canEdit) {
    return res.status(403).json({ message: "Бул кайрылууну түзөтүүгө укук жетишсиз." });
  }

  if (![STATUS_DRAFT, STATUS_RETURNED].includes(request.status)) {
    return res.status(400).json({ message: "Долбоорду же кайтарылган кайрылууну гана түзөтүүгө болот." });
  }

  const nextType = String(req.body.type ?? request.type ?? "").trim();
  const nextDocumentTitle = String(req.body.documentTitle ?? request.documentTitle ?? "").trim();
  const nextReason = String(req.body.reason ?? request.reason ?? "").trim();
  const nextComment = String(req.body.comment ?? request.comment ?? "").trim();
  const nextStartDate = String(req.body.startDate ?? request.startDate ?? "").trim();
  const nextEndDate = String(req.body.endDate ?? request.endDate ?? "").trim();
  const nextAbsenceTime = String(req.body.absenceTime ?? request.absenceTime ?? "").trim();

  if (!nextType || !nextDocumentTitle || !nextReason) {
    return res.status(400).json({ message: "Кайрылуунун түрүн, документтин аталышын жана мазмунун толтуруңуз." });
  }

  if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
    return res.status(400).json({ message: "Аяктоо күнү башталыш күндөн эрте боло албайт." });
  }

  const now = new Date().toISOString();
  const previousAttachment = request.attachment;
  request.type = nextType;
  request.documentTitle = nextDocumentTitle;
  request.reason = nextReason;
  request.comment = nextComment;
  request.startDate = nextStartDate || request.startDate;
  request.endDate = nextEndDate || nextStartDate || request.endDate;
  request.absenceTime = nextAbsenceTime || request.absenceTime;
  request.currentRecipientRole = "TEACHER";
  request.updatedAt = now;

  if (req.file) {
    request.attachment = {
      fileName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };

    if (previousAttachment?.filePath) {
      const previousFilePath = path.join(UPLOAD_DIR, path.basename(previousAttachment.filePath));
      if (fs.existsSync(previousFilePath)) {
        fs.unlinkSync(previousFilePath);
      }
    }
  }

  request.routeHistory = [
    ...request.routeHistory,
    buildRouteStep({
      actor: req.user,
      status: request.status,
      targetRoleCode: "TEACHER",
      comment: nextComment || "Кайрылуу түзөтүлдү",
    }),
  ];

  db.requests[requestIndex] = request;
  writeDb(db);

  appendAuditLog({
    userId: req.user.id,
    action: "Кайрылуу түзөтүлдү",
    entityType: "request",
    entityId: request.id,
    req,
  });

  res.json({ request: decorateRequest(request, db.users) });
});

router.put("/:id/submit", authenticate, (req, res) => {
  const db = readDb();
  const requestIndex = db.requests.findIndex((item) => item.id === req.params.id);

  if (requestIndex === -1) {
    return res.status(404).json({ message: "Кайрылуу табылган жок." });
  }

  const request = normalizeRequest(db.requests[requestIndex], db.users);
  const canSubmit = request.userId === req.user.id || req.user.roleCode === "ADMIN";

  if (!canSubmit) {
    return res.status(403).json({ message: "Бул кайрылууну кайра жөнөтүүгө укук жетишсиз." });
  }

  if (![STATUS_DRAFT, STATUS_RETURNED].includes(request.status)) {
    return res.status(400).json({ message: "Директорго долбоорду же кайтарылган кайрылууну гана жөнөтүүгө болот." });
  }

  const now = new Date().toISOString();
  request.status = STATUS_DIRECTOR_REVIEW;
  request.currentRecipientRole = "DIRECTOR";
  request.updatedAt = now;
  request.routeHistory = [
    ...request.routeHistory,
    buildRouteStep({
      actor: req.user,
      status: STATUS_DIRECTOR_REVIEW,
      targetRoleCode: "DIRECTOR",
      comment: String(req.body.comment || "").trim(),
    }),
  ];

  db.requests[requestIndex] = request;

  const directorIds = db.users
    .filter((user) => ["DIRECTOR", "ADMIN"].includes(user.roleCode))
    .map((user) => user.id);

  notifyUsers(
    db,
    directorIds,
    "Кайрылуу кайра жөнөтүлдү",
    `${req.user.fullName} "${request.documentTitle}" документин директорго кайра жөнөттү.`,
    now,
    getRequestTargetPath(request.id)
  );

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Кайрылуу директорго кайра жөнөтүлдү",
    entityType: "request",
    entityId: request.id,
    req,
  });

  res.json({ request: decorateRequest(request, db.users) });
});

router.put("/:id/complete", authenticate, (req, res) => {
  const db = readDb();
  const requestIndex = db.requests.findIndex((item) => item.id === req.params.id);

  if (requestIndex === -1) {
    return res.status(404).json({ message: "Кайрылуу табылган жок." });
  }

  const request = normalizeRequest(db.requests[requestIndex], db.users);
  const allowedRecipientRoles = ["ACADEMIC_OFFICE", "HR", "ACCOUNTANT"];
  const canComplete =
    allowedRecipientRoles.includes(req.user.roleCode) && request.currentRecipientRole === req.user.roleCode;

  if (!canComplete && !["ADMIN", "DIRECTOR"].includes(req.user.roleCode)) {
    return res.status(403).json({ message: "Документти учурдагы бөлүм же жетекчилик гана аткарылды деп белгилей алат." });
  }

  if (!request.isOfficial || !request.officialDocument) {
    return res.status(400).json({ message: "Расмий PDF түзүлгөн документ гана аткарылды деп белгиленет." });
  }

  const now = new Date().toISOString();
  const comment = String(req.body.comment || "").trim();
  request.status = STATUS_COMPLETED;
  request.currentRecipientRole = null;
  request.completedAt = now;
  request.completedBy = req.user.id;
  request.completedComment = comment;
  request.updatedAt = now;
  request.routeHistory = [
    ...request.routeHistory,
    buildRouteStep({
      actor: req.user,
      status: STATUS_COMPLETED,
      targetRoleCode: null,
      comment,
    }),
  ];

  db.requests[requestIndex] = request;

  const directorIds = db.users
    .filter((user) => ["DIRECTOR", "ADMIN"].includes(user.roleCode))
    .map((user) => user.id);

  notifyUsers(
    db,
    [request.userId, ...directorIds],
    "Документ аткарылды",
    `"${request.documentTitle}" документи ${getRoleTitle(req.user.roleCode)} тарабынан аткарылды деп белгиленди.`,
    now,
    getRequestTargetPath(request.id)
  );

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Документ аткарылды деп белгиленди",
    entityType: "request",
    entityId: request.id,
    req,
  });

  res.json({ request: decorateRequest(request, db.users) });
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

async function updateRequestStatus(req, res) {
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
      const existingOfficialDocument = db.documents.find((item) => item.sourceRequestId === request.id);
      const numberInfo = getOrCreateDocumentNumber(db, "statements", existingOfficialDocument);

      request.status = STATUS_DIRECTOR_SIGNED;
      request.currentRecipientRole = "DIRECTOR";
      request.directorComment = directorComment ?? request.directorComment;
      request.updatedAt = now;

      const { signatureCode, document } = await generateOfficialRequestPdf({
        request: {
          ...request,
          updatedAt: now,
          directorComment: directorComment ?? request.directorComment,
          documentNumber: numberInfo.documentNumber,
        },
        author,
        director,
        targetRoleTitle: getRoleTitle("DIRECTOR"),
      });
      Object.assign(document, numberInfo);

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
        now,
        getRequestTargetPath(request.id)
      );

      writeDb(db);
      appendAuditLog({
        userId: req.user.id,
        action: "Документ ЭЦП менен бекитилип, расмий PDF түзүлдү",
        entityType: "request",
        entityId: request.id,
        req,
      });
      return res.json({ request: decorateRequest(request, db.users) });
    }

    if (!request.isOfficial || !request.directorSignature || !request.officialDocument) {
      const canFinishBeforeSignature = [STATUS_RETURNED, STATUS_REJECTED].includes(normalizedStatus);

      if (!canFinishBeforeSignature) {
        return res.status(400).json({ message: "Адегенде документти «Одобрить» баскычы менен расмий бекитиңиз." });
      }

      request.status = normalizedStatus;
      request.currentRecipientRole = normalizedStatus === STATUS_RETURNED ? "TEACHER" : null;
      request.directorComment = directorComment ?? request.directorComment;
      request.updatedAt = now;
      request.routeHistory = [
        ...request.routeHistory,
        buildRouteStep({
          actor: req.user,
          status: normalizedStatus,
          targetRoleCode: request.currentRecipientRole,
          comment: directorComment,
          signatureName: signatureName || req.user.fullName,
        }),
      ];

      db.requests[requestIndex] = request;

      notifyUsers(
        db,
        [request.userId],
        normalizedStatus === STATUS_RETURNED ? "Кайрылуу кайра иштөөгө кайтарылды" : "Кайрылуу четке кагылды",
        normalizedStatus === STATUS_RETURNED
          ? `"${request.documentTitle}" документи директор тарабынан кайра иштөөгө кайтарылды.`
          : `"${request.documentTitle}" документи директор тарабынан четке кагылды.`,
        now,
        getRequestTargetPath(request.id)
      );

      writeDb(db);
      appendAuditLog({
        userId: req.user.id,
        action:
          normalizedStatus === STATUS_RETURNED
            ? "Кайрылуу окутуучуга кайтарылды"
            : "Кайрылуу четке кагылды",
        entityType: "request",
        entityId: request.id,
        req,
      });

      return res.json({ request: decorateRequest(request, db.users) });
    }

    let resolvedTargetRole = nextRoleCode;
    if (!resolvedTargetRole) {
      resolvedTargetRole =
        normalizedStatus === STATUS_TO_ACADEMIC_OFFICE
          ? "ACADEMIC_OFFICE"
          : normalizedStatus === STATUS_TO_HR
          ? "HR"
          : normalizedStatus === STATUS_TO_ACCOUNTING
            ? "ACCOUNTANT"
            : "TEACHER";
    }

    const allowedTargets = ["ACADEMIC_OFFICE", "HR", "ACCOUNTANT", "TEACHER"];
    if (!allowedTargets.includes(resolvedTargetRole)) {
      return res.status(400).json({ message: "Документтин туура маршрутун көрсөтүңүз." });
    }

    const resolvedStatus =
      normalizedStatus ||
      (resolvedTargetRole === "ACADEMIC_OFFICE"
        ? STATUS_TO_ACADEMIC_OFFICE
        : resolvedTargetRole === "HR"
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
      now,
      getRequestTargetPath(request.id)
    );

    if (resolvedTargetRole !== "TEACHER") {
      notifyUsers(
        db,
        [request.userId],
        "Документ жөнөтүлдү",
        `"${request.documentTitle}" расмий документи "${getRoleTitle(resolvedTargetRole)}" бөлүмүнө жөнөтүлдү.`,
        now,
        getRequestTargetPath(request.id)
      );
    }

    writeDb(db);
    appendAuditLog({
      userId: req.user.id,
      action: `Расмий документ "${getRoleTitle(resolvedTargetRole)}" бөлүмүнө жөнөтүлдү`,
      entityType: "request",
      entityId: request.id,
      req,
    });

    return res.json({ request: decorateRequest(request, db.users) });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Кайрылууну иштетүүдө ката кетти." });
  }
}

router.put("/:id/status", authenticate, updateRequestStatus);
router.patch("/:id/status", authenticate, updateRequestStatus);

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
