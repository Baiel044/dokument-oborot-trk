const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { authenticate } = require("../middleware/auth");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");
const { UPLOAD_DIR } = require("../utils/config");
const { DOCUMENT_CATEGORIES, normalizeDocumentCategory } = require("../utils/catalogs");
const { generateLetterheadDocumentPdf, generateOfficialDocumentPdf } = require("../utils/letterheadDocumentPdf");
const { createDocumentNumber } = require("../utils/documentNumbering");
const { DOCUMENT_EXTENSIONS, isAllowedDocumentFile, isAllowedPdfFile } = require("../utils/uploadValidation");

const router = express.Router();
const ASSIGNMENT_TYPES = ["execution", "review"];
const ASSIGNMENT_STATUSES = ["sent", "read", "completed"];
const DOCUMENT_API_STATUSES = ["draft", "submitted", "pending", "approved", "returned", "rejected", "completed"];
const DEFAULT_DOCUMENT_STATUS = "draft";
const INITIAL_DOCUMENT_STATUSES = ["draft", "submitted"];
const DOCUMENT_STATUS_TRANSITIONS = {
  draft: ["submitted"],
  submitted: ["pending"],
  pending: ["approved", "returned", "rejected"],
  returned: ["submitted"],
  approved: ["completed"],
};
const DOCUMENT_STATUS_ACTIONS = {
  draft: "created",
  submitted: "submitted",
  pending: "sent_to_review",
  approved: "approved",
  returned: "returned",
  rejected: "rejected",
  completed: "completed",
};
const LETTERHEAD_ASSETS_DIR = path.join(__dirname, "..", "..", "assets");
const LETTERHEAD_TEMPLATE_PATH = path.join(LETTERHEAD_ASSETS_DIR, "letterhead-template.pdf");

function normalizeDocumentStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return DOCUMENT_API_STATUSES.includes(normalized) ? normalized : "";
}

function getDocumentStatus(document) {
  const normalized = normalizeDocumentStatus(document.status);
  if (normalized) {
    return normalized;
  }

  const assignments = Array.isArray(document.assignments) ? document.assignments : [];
  if (assignments.some((assignment) => assignment.status === "completed")) {
    return "completed";
  }

  if (document.isOfficial || document.generatedOnLetterhead || document.sourceRequestId) {
    return "approved";
  }

  return DEFAULT_DOCUMENT_STATUS;
}

function getDocumentRecipientRole(status) {
  if (status === "submitted" || status === "pending") {
    return "DIRECTOR";
  }

  if (status === "returned") {
    return "TEACHER";
  }

  return null;
}

function decorateDocument(document, users) {
  const uploader = users.find((user) => user.id === document.uploadedBy);
  const signer = users.find((user) => user.id === document.approvedBy);
  const isOfficial = Boolean(document.isOfficial || document.sourceRequestId);
  return {
    ...document,
    status: getDocumentStatus(document),
    fileName: document.fileName || document.officialDocument?.originalTitle || document.officialDocument?.fileName || path.basename(document.filePath || ""),
    isOfficial,
    authorName: uploader?.fullName || document.authorName || "",
    signedByName:
      document.digitalSignature?.signedBy ||
      document.directorSignature?.signedBy ||
      signer?.fullName ||
      "",
    uploadedByName: uploader?.fullName || "Белгисиз",
    routeHistory: Array.isArray(document.routeHistory) ? document.routeHistory : [],
    assignments: Array.isArray(document.assignments)
      ? document.assignments.map((assignment) => {
          const recipient = users.find((user) => user.id === assignment.recipientId);
          const sender = users.find((user) => user.id === assignment.senderId);
          return {
            ...assignment,
            recipientName: recipient?.fullName || "Белгисиз",
            senderName: sender?.fullName || "Белгисиз",
          };
        })
      : [],
  };
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

  if (document.assignedRoleCode === user.roleCode || document.assignedToRole === user.roleCode) {
    return true;
  }

  if (document.departmentId && document.departmentId === user.departmentId) {
    return true;
  }

  const assignments = Array.isArray(document.assignments) ? document.assignments : [];
  return assignments.some((assignment) => assignment.recipientId === user.id || assignment.senderId === user.id);
}

function isDocumentAssignmentParticipant(user, document) {
  const assignments = Array.isArray(document.assignments) ? document.assignments : [];
  return assignments.some((assignment) => assignment.recipientId === user.id || assignment.senderId === user.id);
}

function canChangeDocumentStatus(user, document, nextStatus) {
  if (user.roleCode === "ADMIN") {
    return true;
  }

  if (nextStatus === "submitted") {
    return document.uploadedBy === user.id;
  }

  if (nextStatus === "pending") {
    return user.roleCode === "DIRECTOR";
  }

  if (["approved", "returned", "rejected"].includes(nextStatus)) {
    return user.roleCode === "DIRECTOR";
  }

  if (nextStatus === "completed") {
    return user.roleCode === "DIRECTOR" || document.uploadedBy === user.id || isDocumentAssignmentParticipant(user, document);
  }

  return false;
}

function canAttachDocumentFile(user, document) {
  return ["ADMIN", "DIRECTOR"].includes(user.roleCode) || document.uploadedBy === user.id;
}

function buildDocumentRouteStep({ user, status, action, comment, createdAt }) {
  return {
    id: createId("route"),
    status,
    action,
    userId: user.id,
    userName: user.fullName,
    userRole: user.roleCode,
    comment: comment || "",
    createdAt,
  };
}

function appendDocumentRouteHistory(document, step) {
  document.routeHistory = Array.isArray(document.routeHistory) ? document.routeHistory : [];
  document.routeHistory.push(step);
}

function getDirectorUserIds(db, excludedUserId) {
  return db.users
    .filter((user) => user.status === "active" && ["DIRECTOR", "ADMIN"].includes(user.roleCode) && user.id !== excludedUserId)
    .map((user) => user.id);
}

function addDocumentNotifications(db, req, document, status, oldStatus, createdAt) {
  const targetPath = `/documents?document=${encodeURIComponent(document.id)}`;
  const documentTitle = document.title || document.fileName || document.documentNumber || "document";
  const actorName = req.user.fullName || req.user.username || req.user.id;
  const targets = new Set();
  let title = "";
  let text = "";

  if (status === "submitted" || status === "pending") {
    getDirectorUserIds(db, req.user.id).forEach((userId) => targets.add(userId));
    title = "Document sent to review";
    text = `${actorName} sent "${documentTitle}" for review.`;
  } else if (["approved", "returned", "rejected"].includes(status)) {
    if (document.uploadedBy && document.uploadedBy !== req.user.id) {
      targets.add(document.uploadedBy);
    }
    title = `Document ${status}`;
    text = `"${documentTitle}" status changed from ${oldStatus} to ${status}.`;
  } else if (status === "completed") {
    if (document.uploadedBy && document.uploadedBy !== req.user.id) {
      targets.add(document.uploadedBy);
    }
    getDirectorUserIds(db, req.user.id).forEach((userId) => targets.add(userId));
    title = "Document completed";
    text = `"${documentTitle}" was completed by ${actorName}.`;
  }

  targets.forEach((userId) => {
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

function parseInitialDocumentStatus(value) {
  const status = normalizeDocumentStatus(value) || DEFAULT_DOCUMENT_STATUS;
  return INITIAL_DOCUMENT_STATUSES.includes(status) ? status : "";
}

function addInitialDocumentHistory(document, user, status, comment, createdAt) {
  document.routeHistory = [
    buildDocumentRouteStep({
      user,
      status: DEFAULT_DOCUMENT_STATUS,
      action: "created",
      comment,
      createdAt,
    }),
  ];

  if (status !== DEFAULT_DOCUMENT_STATUS) {
    appendDocumentRouteHistory(
      document,
      buildDocumentRouteStep({
        user,
        status,
        action: DOCUMENT_STATUS_ACTIONS[status],
        comment,
        createdAt,
      })
    );
  }
}

function getOfficialPdfRecord(document) {
  if (typeof document.officialPdf === "string") {
    return {
      filePath: document.officialPdf,
      fileName: path.basename(document.officialPdf),
      originalTitle: document.title ? `${document.title}.pdf` : "official-document.pdf",
      mimeType: "application/pdf",
      isOfficial: true,
      documentNumber: document.documentNumber || null,
    };
  }

  return document.officialPdf || null;
}

function getUsableOfficialPdf(document) {
  const officialPdf = getOfficialPdfRecord(document);
  if (!officialPdf?.filePath) {
    return null;
  }

  const absolutePath = path.join(UPLOAD_DIR, path.basename(officialPdf.filePath));
  return fs.existsSync(absolutePath) ? officialPdf : null;
}

function buildOfficialPdfResponse(officialPdf) {
  if (!officialPdf) {
    return null;
  }

  const fileName = officialPdf.fileName || path.basename(officialPdf.filePath || "");
  return {
    ...officialPdf,
    fileName,
    downloadPath: fileName ? `/api/files/${fileName}` : "",
  };
}

function addOfficialPdfNotification(db, req, document, createdAt) {
  if (!document.uploadedBy || document.uploadedBy === req.user.id) {
    return;
  }

  db.notifications.unshift({
    id: createId("notif"),
    userId: document.uploadedBy,
    title: "Официальный PDF готов",
    text: `Для документа "${document.title || document.fileName || document.documentNumber || document.id}" сформирован официальный PDF.`,
    targetPath: `/documents?document=${encodeURIComponent(document.id)}`,
    isRead: false,
    createdAt,
  });
}

async function attachOfficialPdfToDocument(db, req, document) {
  const existingOfficialPdf = getUsableOfficialPdf(document);
  if (existingOfficialPdf) {
    return {
      officialPdf: existingOfficialPdf,
      generated: false,
      reused: true,
    };
  }

  const author = db.users.find((user) => user.id === document.uploadedBy) || null;
  const director =
    db.users.find((user) => user.id === document.approvedBy) ||
    (req.user.roleCode === "DIRECTOR" ? req.user : null);
  const now = new Date().toISOString();
  const officialPdf = await generateOfficialDocumentPdf({
    document: {
      ...document,
      status: getDocumentStatus(document),
      routeHistory: Array.isArray(document.routeHistory) ? document.routeHistory : [],
    },
    author,
    director,
  });

  document.officialPdf = officialPdf;
  document.isOfficial = true;
  document.officialPdfGeneratedAt = officialPdf.generatedAt;
  document.updatedAt = now;
  addOfficialPdfNotification(db, req, document, now);

  return {
    officialPdf,
    generated: true,
    reused: false,
  };
}

function appendOfficialPdfAudit(req, document, officialPdf, metadata = {}) {
  appendAuditLog({
    userId: req.user.id,
    action: "Official document PDF generated",
    entityType: "document",
    entityId: document.id,
    req,
    metadata: {
      fileName: officialPdf.fileName,
      filePath: officialPdf.filePath,
      documentNumber: officialPdf.documentNumber || "without-number",
      ...metadata,
    },
  });
}

function updateDocumentStatus(req, res, statusOverride) {
  return updateDocumentStatusWorkflow(req, res, statusOverride);

  const db = readDb();
  const document = db.documents.find((item) => item.id === req.params.id);

  if (!document) {
    return res.status(404).json({ message: "Р”РѕРєСѓРјРµРЅС‚ С‚Р°Р±С‹Р»РіР°РЅ Р¶РѕРє." });
  }

  if (!canManageDocumentStatus(req.user, document)) {
    return res.status(403).json({ message: "Р”РѕРєСѓРјРµРЅС‚С‚РёРЅ СЃС‚Р°С‚СѓСЃСѓРЅ У©Р·РіУ©СЂС‚ТЇТЇРіУ© СѓРєСѓРє Р¶РµС‚РёС€СЃРёР·." });
  }

  const status = String(statusOverride || req.body.status || "").trim();
  if (!DOCUMENT_API_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Р”РѕРєСѓРјРµРЅС‚С‚РёРЅ С‚СѓСѓСЂР° СЃС‚Р°С‚СѓСЃСѓРЅ С‚Р°РЅРґР°ТЈС‹Р·." });
  }

  const now = new Date().toISOString();
  const comment = String(req.body.comment || req.body.reason || "").trim();
  document.status = status;
  document.statusComment = comment || document.statusComment || "";
  document.updatedAt = now;

  if (status === "approved") {
    document.approvedAt = document.approvedAt || now;
    document.approvedBy = document.approvedBy || req.user.id;
  }

  if (status === "returned") {
    document.returnedAt = now;
    document.returnedBy = req.user.id;
    document.returnComment = comment;
  }

  notifyDocumentOwner(
    db,
    req,
    document,
    "Р”РѕРєСѓРјРµРЅС‚ СЃС‚Р°С‚СѓСЃСѓ У©Р·РіУ©СЂРґТЇ",
    `"${document.title}" РґРѕРєСѓРјРµРЅС‚РёРЅРёРЅ СЃС‚Р°С‚СѓСЃСѓ: ${status}.`,
    now
  );

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Р”РѕРєСѓРјРµРЅС‚ СЃС‚Р°С‚СѓСЃСѓ У©Р·РіУ©СЂС‚ТЇР»РґТЇ",
    entityType: "document",
    entityId: document.id,
    req,
    metadata: { status, comment },
  });

  return res.json({ document: decorateDocument(document, db.users) });
}

async function updateDocumentStatusWorkflow(req, res, statusOverride) {
  const db = readDb();
  const document = db.documents.find((item) => item.id === req.params.id);

  if (!document) {
    return res.status(404).json({ message: "Document not found." });
  }

  const status = normalizeDocumentStatus(statusOverride || req.body.status);
  if (!status) {
    return res.status(400).json({ message: "Invalid document status." });
  }

  const oldStatus = getDocumentStatus(document);
  const allowedNextStatuses = DOCUMENT_STATUS_TRANSITIONS[oldStatus] || [];
  if (!allowedNextStatuses.includes(status)) {
    return res.status(400).json({
      message: `Document status transition ${oldStatus} -> ${status} is not allowed.`,
    });
  }

  if (!canChangeDocumentStatus(req.user, document, status)) {
    return res.status(403).json({ message: "You do not have permission to change this document status." });
  }

  const now = new Date().toISOString();
  const comment = String(req.body.comment || req.body.reason || "").trim();
  const action = String(req.body.action || "").trim() || DOCUMENT_STATUS_ACTIONS[status] || "status_changed";

  document.status = status;
  document.statusComment = comment || document.statusComment || "";
  document.currentRecipientRole = getDocumentRecipientRole(status);
  document.updatedAt = now;

  if (status === "approved") {
    document.approvedAt = now;
    document.approvedBy = req.user.id;
  }

  if (status === "returned") {
    document.returnedAt = now;
    document.returnedBy = req.user.id;
    document.returnComment = comment;
  }

  if (status === "rejected") {
    document.rejectedAt = now;
    document.rejectedBy = req.user.id;
    document.rejectComment = comment;
  }

  if (status === "completed") {
    document.completedAt = now;
    document.completedBy = req.user.id;
    document.completeComment = comment;
  }

  appendDocumentRouteHistory(
    document,
    buildDocumentRouteStep({
      user: req.user,
      status,
      action,
      comment,
      createdAt: now,
    })
  );
  addDocumentNotifications(db, req, document, status, oldStatus, now);

  let officialPdfResult = null;
  let pdfWarning = "";
  let pdfGenerationError = null;

  if (status === "approved") {
    try {
      officialPdfResult = await attachOfficialPdfToDocument(db, req, document);
    } catch (error) {
      pdfGenerationError = error;
      pdfWarning = "Document approved, but official PDF was not generated. Generate PDF manually.";
      console.error(`Official PDF generation failed for document ${document.id}:`, error);
    }
  }

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Document status changed",
    entityType: "document",
    entityId: document.id,
    req,
    metadata: {
      oldStatus,
      newStatus: status,
      action,
      changedAt: now,
      comment,
    },
  });

  if (officialPdfResult?.generated) {
    appendOfficialPdfAudit(req, document, officialPdfResult.officialPdf, { source: "approve" });
  }

  if (pdfGenerationError) {
    appendAuditLog({
      userId: req.user.id,
      action: "Official document PDF generation failed",
      entityType: "document",
      entityId: document.id,
      req,
      metadata: {
        source: "approve",
        error: pdfGenerationError.message || String(pdfGenerationError),
      },
    });
  }

  const response = { document: decorateDocument(document, db.users) };
  if (officialPdfResult?.officialPdf) {
    response.officialPdf = buildOfficialPdfResponse(officialPdfResult.officialPdf);
    response.officialPdfReused = officialPdfResult.reused;
  }
  if (pdfWarning) {
    response.warning = pdfWarning;
  }

  return res.json(response);
}

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

const letterheadTemplateStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(LETTERHEAD_ASSETS_DIR, { recursive: true });
    cb(null, LETTERHEAD_ASSETS_DIR);
  },
  filename: (_req, _file, cb) => cb(null, "letterhead-template.pdf"),
});

const uploadLetterheadTemplate = multer({
  storage: letterheadTemplateStorage,
  fileFilter: (_req, file, cb) => {
    if (!isAllowedPdfFile(file)) {
      cb(new Error("Фирмалык бланктын шаблону PDF форматында болушу керек."));
      return;
    }

    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function getEffectiveDocumentCategory(document) {
  const normalizedCategory = normalizeDocumentCategory(document.category);
  if (DOCUMENT_CATEGORIES.includes(normalizedCategory)) {
    return normalizedCategory;
  }

  if (document.sourceRequestId || document.isOfficial) {
    return "statements";
  }

  return document.category || "statements";
}

function getLetterheadTemplateInfo() {
  if (!fs.existsSync(LETTERHEAD_TEMPLATE_PATH)) {
    return {
      exists: false,
      fileName: "letterhead-template.pdf",
      updatedAt: null,
      size: 0,
    };
  }

  const stats = fs.statSync(LETTERHEAD_TEMPLATE_PATH);
  return {
    exists: true,
    fileName: "letterhead-template.pdf",
    updatedAt: stats.mtime.toISOString(),
    size: stats.size,
  };
}

function canManageLetterheadTemplate(user) {
  return ["ADMIN", "DIRECTOR"].includes(user.roleCode);
}

function requireLetterheadTemplateManager(req, res, next) {
  if (!canManageLetterheadTemplate(req.user)) {
    return res.status(403).json({ message: "Фирмалык бланктын шаблонун жаңыртууга укук жетишсиз." });
  }

  return next();
}

router.get("/", authenticate, (req, res) => {
  const db = readDb();

  const categoryFilter = normalizeDocumentCategory(req.query.category) || String(req.query.category || "").trim();
  const sourceFilter = String(req.query.source || "").trim();

  const documents = [...db.documents]
    .filter((document) => canViewDocument(req.user, document))
    .filter((document) => {
      if (categoryFilter && getEffectiveDocumentCategory(document) !== categoryFilter) {
        return false;
      }

      if (sourceFilter === "letterhead" && !document.generatedOnLetterhead) {
        return false;
      }

      if (sourceFilter === "official" && !document.isOfficial && !document.sourceRequestId) {
        return false;
      }

      if (sourceFilter === "uploaded" && (document.generatedOnLetterhead || document.isOfficial || document.sourceRequestId)) {
        return false;
      }

      return true;
    })
    .map((document) => decorateDocument({ ...document, category: getEffectiveDocumentCategory(document) }, db.users));

  res.json({ documents });
});

router.post("/", authenticate, upload.single("file"), (req, res) => {
  const db = readDb();
  const category = normalizeDocumentCategory(req.body.category);
  const initialStatus = parseInitialDocumentStatus(req.body.status);

  if (!req.file) {
    return res.status(400).json({ message: "Документ файлын жүктөңүз." });
  }

  if (!DOCUMENT_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: "Документтин туура категориясын тандаңыз." });
  }

  if (!initialStatus) {
    return res.status(400).json({ message: "Initial document status must be draft or submitted." });
  }
  const createdAt = new Date().toISOString();
  const numberInfo = createDocumentNumber(db, category);
  const title = String(req.body.title || req.file.originalname).trim();
  const description = String(req.body.description || "").trim();
  const document = {
    id: createId("doc"),
    ...numberInfo,
    title: title || req.file.originalname,
    filePath: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    uploadedBy: req.user.id,
    category,
    description,
    status: initialStatus,
    currentRecipientRole: getDocumentRecipientRole(initialStatus),
    createdAt,
  };
  addInitialDocumentHistory(document, req.user, initialStatus, description, createdAt);
  addDocumentNotifications(db, req, document, initialStatus, DEFAULT_DOCUMENT_STATUS, createdAt);

  db.documents.unshift(document);
  writeDb(db);

  appendAuditLog({
    userId: req.user.id,
    action: "Документ жүктөлдү",
    entityType: "document",
    entityId: document.id,
    req,
    metadata: {
      status: initialStatus,
      action: initialStatus === "submitted" ? "submitted" : "created",
    },
  });

  res.status(201).json({ document: decorateDocument(document, db.users) });
});

router.post("/generate-letterhead", authenticate, async (req, res) => {
  try {
    const db = readDb();
    const category = normalizeDocumentCategory(req.body.category);
    const initialStatus = parseInitialDocumentStatus(req.body.status);
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();

    if (!title) {
      return res.status(400).json({ message: "Документтин аталышын жазыңыз." });
    }

    if (!DOCUMENT_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Документтин туура категориясын тандаңыз." });
    }

    if (!initialStatus) {
      return res.status(400).json({ message: "Initial document status must be draft or submitted." });
    }
    const createdAt = new Date().toISOString();
    const numberInfo = createDocumentNumber(db, category);
    const categoryTitles = {
      statements: "Заявления",
      orders: "Приказы",
      certificates: "Справки",
      incoming: "Входящие документы",
      outgoing: "Исходящие документы",
      reports: "Отчёты",
    };

    const generatedFile = await generateLetterheadDocumentPdf({
      title,
      categoryTitle: categoryTitles[category] || category,
      description,
      author: req.user,
      documentNumber: numberInfo.documentNumber,
    });

    const document = {
      id: createId("doc"),
      ...numberInfo,
      title,
      filePath: generatedFile.filePath,
      fileName: generatedFile.originalTitle,
      uploadedBy: req.user.id,
      category,
      description,
      status: initialStatus,
      currentRecipientRole: getDocumentRecipientRole(initialStatus),
      createdAt,
      generatedOnLetterhead: true,
    };
    addInitialDocumentHistory(document, req.user, initialStatus, description, createdAt);
    addDocumentNotifications(db, req, document, initialStatus, DEFAULT_DOCUMENT_STATUS, createdAt);

    db.documents.unshift(document);
    writeDb(db);

    appendAuditLog({
      userId: req.user.id,
      action: "Документ фирмалык бланкта түзүлдү",
      entityType: "document",
      entityId: document.id,
      req,
      metadata: {
        status: initialStatus,
        action: initialStatus === "submitted" ? "submitted" : "created",
      },
    });

    return res.status(201).json({ document: decorateDocument(document, db.users) });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Фирмалык бланкта документ түзүүдө ката кетти." });
  }
});

router.get("/letterhead-template", authenticate, (req, res) => {
  if (!canManageLetterheadTemplate(req.user)) {
    return res.status(403).json({ message: "Фирмалык бланктын шаблонун көрүүгө укук жетишсиз." });
  }

  res.json({ template: getLetterheadTemplateInfo() });
});

router.get("/letterhead-template/file", authenticate, requireLetterheadTemplateManager, (req, res) => {
  if (!fs.existsSync(LETTERHEAD_TEMPLATE_PATH)) {
    return res.status(404).json({ message: "Фирмалык бланктын PDF шаблону жүктөлө элек." });
  }

  appendAuditLog({
    userId: req.user.id,
    action: "Фирмалык бланктын PDF шаблону ачылды",
    entityType: "letterhead-template",
    entityId: "letterhead-template.pdf",
    req,
  });

  res.setHeader("Content-Disposition", 'inline; filename="letterhead-template.pdf"');
  return res.sendFile(LETTERHEAD_TEMPLATE_PATH);
});

router.post("/letterhead-template", authenticate, requireLetterheadTemplateManager, uploadLetterheadTemplate.single("template"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "PDF-шаблонду жүктөңүз." });
  }

  appendAuditLog({
    userId: req.user.id,
    action: "Фирмалык бланктын PDF шаблону жаңыртылды",
    entityType: "letterhead-template",
    entityId: "letterhead-template.pdf",
    req,
  });

  res.json({ template: getLetterheadTemplateInfo() });
});

router.get("/:id", authenticate, (req, res) => {
  const db = readDb();
  const document = db.documents.find((item) => item.id === req.params.id);

  if (!document) {
    return res.status(404).json({ message: "Документ табылган жок." });
  }

  if (!canViewDocument(req.user, document)) {
    return res.status(403).json({ message: "Документти көрүүгө укук жетишсиз." });
  }

  res.json({ document: decorateDocument(document, db.users) });
});

router.patch("/:id/status", authenticate, (req, res) => updateDocumentStatusWorkflow(req, res));

router.post("/:id/approve", authenticate, (req, res) => {
  if (!["ADMIN", "DIRECTOR"].includes(req.user.roleCode)) {
    return res.status(403).json({ message: "Р”РѕРєСѓРјРµРЅС‚С‚Рё Р±РµРєРёС‚ТЇТЇ РґРёСЂРµРєС‚РѕСЂРіРѕ Р¶Рµ Р°РґРјРёРЅРіРµ РіР°РЅР° Р¶РµС‚РєРёР»РёРєС‚ТЇТЇ." });
  }

  return updateDocumentStatusWorkflow(req, res, "approved");
});

router.post("/:id/return", authenticate, (req, res) => {
  if (!["ADMIN", "DIRECTOR"].includes(req.user.roleCode)) {
    return res.status(403).json({ message: "Р”РѕРєСѓРјРµРЅС‚С‚Рё РєР°Р№С‚Р°СЂСѓСѓ РґРёСЂРµРєС‚РѕСЂРіРѕ Р¶Рµ Р°РґРјРёРЅРіРµ РіР°РЅР° Р¶РµС‚РєРёР»РёРєС‚ТЇТЇ." });
  }

  return updateDocumentStatusWorkflow(req, res, "returned");
});

router.post("/:id/generate-pdf", authenticate, (req, res) => {
  const db = readDb();
  const document = db.documents.find((item) => item.id === req.params.id);

  if (!document) {
    return res.status(404).json({ message: "Р”РѕРєСѓРјРµРЅС‚ С‚Р°Р±С‹Р»РіР°РЅ Р¶РѕРє." });
  }

  if (!canViewDocument(req.user, document)) {
    return res.status(403).json({ message: "Р”РѕРєСѓРјРµРЅС‚С‚Рё РєУ©СЂТЇТЇРіУ© СѓРєСѓРє Р¶РµС‚РёС€СЃРёР·." });
  }

  const existingOfficialPdf = getUsableOfficialPdf(document);
  if (existingOfficialPdf) {
    return res.json({
      document: decorateDocument(document, db.users),
      officialPdf: buildOfficialPdfResponse(existingOfficialPdf),
      officialPdfReused: true,
    });
  }

  const author = db.users.find((user) => user.id === document.uploadedBy) || null;
  const director =
    db.users.find((user) => user.id === document.approvedBy) ||
    (req.user.roleCode === "DIRECTOR" ? req.user : null);
  const pdfDocumentData = {
    ...document,
    status: getDocumentStatus(document),
    routeHistory: Array.isArray(document.routeHistory) ? document.routeHistory : [],
  };

  return generateOfficialDocumentPdf({
    document: pdfDocumentData,
    author,
    director,
  })
    .then((officialPdf) => {
      const now = new Date().toISOString();

      document.officialPdf = officialPdf;
      document.isOfficial = true;
      document.officialPdfGeneratedAt = officialPdf.generatedAt;
      document.updatedAt = now;

      if (document.uploadedBy && document.uploadedBy !== req.user.id) {
        db.notifications.unshift({
          id: createId("notif"),
          userId: document.uploadedBy,
          title: "Официальный PDF готов",
          text: `Для документа "${document.title || document.fileName || document.documentNumber || document.id}" сформирован официальный PDF.`,
          targetPath: `/documents?document=${encodeURIComponent(document.id)}`,
          isRead: false,
          createdAt: now,
        });
      }

      writeDb(db);
      appendOfficialPdfAudit(req, document, officialPdf, { source: "manual" });

      return res.json({
        document: decorateDocument(document, db.users),
        officialPdf: {
          ...officialPdf,
          downloadPath: `/api/files/${officialPdf.fileName}`,
        },
      });
    })
    .catch((error) =>
      res.status(500).json({
        message: error.message || "PDF generation failed.",
      })
    );

  return res.status(501).json({
    message: "РЈРЅРёРІРµСЂСЃР°Р»РґСѓСѓ PDF РіРµРЅРµСЂР°С†РёСЏСЃС‹ 5-СЌС‚Р°РїС‚Р° РёС€РєРµ Р°С€С‹СЂС‹Р»Р°С‚.",
    document: decorateDocument(document, db.users),
  });
});

router.post("/:id/files", authenticate, upload.single("file"), (req, res) => {
  const db = readDb();
  const document = db.documents.find((item) => item.id === req.params.id);

  if (!document) {
    return res.status(404).json({ message: "Р”РѕРєСѓРјРµРЅС‚ С‚Р°Р±С‹Р»РіР°РЅ Р¶РѕРє." });
  }

  if (!canAttachDocumentFile(req.user, document)) {
    return res.status(403).json({ message: "Р”РѕРєСѓРјРµРЅС‚РєРµ С„Р°Р№Р» РєРѕС€СѓСѓРіР° СѓРєСѓРє Р¶РµС‚РёС€СЃРёР·." });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Р”РѕРєСѓРјРµРЅС‚ С„Р°Р№Р»С‹РЅ Р¶ТЇРєС‚У©ТЈТЇР·." });
  }

  const now = new Date().toISOString();
  const file = {
    id: createId("file"),
    filePath: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user.id,
    createdAt: now,
  };

  document.files = Array.isArray(document.files) ? document.files : [];
  document.files.unshift(file);
  document.updatedAt = now;

  if (!document.filePath) {
    document.filePath = file.filePath;
    document.fileName = file.fileName;
  }

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Р”РѕРєСѓРјРµРЅС‚РєРµ С„Р°Р№Р» РєРѕС€СѓР»РґСѓ",
    entityType: "document",
    entityId: document.id,
    req,
    metadata: { fileName: file.fileName },
  });

  return res.status(201).json({ document: decorateDocument(document, db.users), file });
});

router.post("/:id/assign", authenticate, (req, res) => {
  if (!["DIRECTOR", "ADMIN"].includes(req.user.roleCode)) {
    return res.status(403).json({ message: "Документти жөнөтүү директорго гана жеткиликтүү." });
  }

  const db = readDb();
  const document = db.documents.find((item) => item.id === req.params.id);
  if (!document) {
    return res.status(404).json({ message: "Документ табылган жок." });
  }

  const recipientId = String(req.body.recipientId || "").trim();
  const assignmentType = String(req.body.assignmentType || "").trim();
  const comment = String(req.body.comment || "").trim();

  if (!recipientId) {
    return res.status(400).json({ message: "Алуучуну тандаңыз." });
  }

  if (!ASSIGNMENT_TYPES.includes(assignmentType)) {
    return res.status(400).json({ message: "Жөнөтүү түрүн тандаңыз." });
  }

  const recipient = db.users.find((user) => user.id === recipientId && user.status === "active");
  if (!recipient) {
    return res.status(404).json({ message: "Алуучу табылган жок." });
  }

  const createdAt = new Date().toISOString();
  const assignment = {
    id: createId("assignment"),
    senderId: req.user.id,
    recipientId,
    assignmentType,
    comment,
    status: "sent",
    createdAt,
  };

  document.assignments = Array.isArray(document.assignments) ? document.assignments : [];
  document.assignments.unshift(assignment);
  document.updatedAt = createdAt;

  const assignmentTitle = assignmentType === "execution" ? "Документ к исполнению" : "Документ для ознакомления";
  db.notifications.unshift({
    id: createId("notif"),
    userId: recipientId,
    title: assignmentTitle,
    text: `${req.user.fullName} направил(а) документ: ${document.title}`,
    targetPath: `/documents?document=${encodeURIComponent(document.id)}`,
    isRead: false,
    createdAt,
  });

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Документ жөнөтүлдү",
    entityType: "document",
    entityId: document.id,
    req,
  });

  res.status(201).json({ document: decorateDocument(document, db.users) });
});

router.put("/:id/assignments/:assignmentId/status", authenticate, (req, res) => {
  const db = readDb();
  const document = db.documents.find((item) => item.id === req.params.id);

  if (!document) {
    return res.status(404).json({ message: "Документ табылган жок." });
  }

  const assignments = Array.isArray(document.assignments) ? document.assignments : [];
  const assignment = assignments.find((item) => item.id === req.params.assignmentId);

  if (!assignment) {
    return res.status(404).json({ message: "Тапшырма табылган жок." });
  }

  const canUpdate =
    assignment.recipientId === req.user.id ||
    assignment.senderId === req.user.id ||
    ["ADMIN", "DIRECTOR"].includes(req.user.roleCode);

  if (!canUpdate) {
    return res.status(403).json({ message: "Тапшырманы жаңыртууга укук жетишсиз." });
  }

  const status = String(req.body.status || "").trim();
  const comment = String(req.body.comment || "").trim();

  if (!ASSIGNMENT_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Тапшырманын туура абалын тандаңыз." });
  }

  const now = new Date().toISOString();
  assignment.status = status;
  assignment.completedAt = status === "completed" ? now : assignment.completedAt || null;
  assignment.readAt = status === "read" || status === "completed" ? assignment.readAt || now : assignment.readAt || null;
  assignment.resultComment = comment || assignment.resultComment || "";
  document.updatedAt = now;

  if (assignment.senderId !== req.user.id) {
    db.notifications.unshift({
      id: createId("notif"),
      userId: assignment.senderId,
      title: status === "completed" ? "Документ аткарылды" : "Документ окулду",
      text:
        status === "completed"
          ? `${req.user.fullName} "${document.title}" документи боюнча тапшырманы аткарды.`
          : `${req.user.fullName} "${document.title}" документи менен таанышты.`,
      targetPath: `/documents?document=${encodeURIComponent(document.id)}`,
      isRead: false,
      createdAt: now,
    });
  }

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: status === "completed" ? "Документ тапшырмасы аткарылды" : "Документ тапшырмасы окулду",
    entityType: "document-assignment",
    entityId: assignment.id,
    req,
  });

  res.json({ document: decorateDocument(document, db.users) });
});

router.delete("/:id", authenticate, (req, res) => {
  const db = readDb();
  const documentIndex = db.documents.findIndex((item) => item.id === req.params.id);

  if (documentIndex === -1) {
    return res.status(404).json({ message: "Документ табылган жок." });
  }

  const document = db.documents[documentIndex];
  if (document.uploadedBy !== req.user.id && !["ADMIN", "DIRECTOR"].includes(req.user.roleCode)) {
    return res.status(403).json({ message: "Документти өчүрүүгө укук жетишсиз." });
  }

  db.documents.splice(documentIndex, 1);
  writeDb(db);

  if (document.filePath) {
    const fileName = path.basename(document.filePath);
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  appendAuditLog({
    userId: req.user.id,
    action: "Документ өчүрүлдү",
    entityType: "document",
    entityId: document.id,
    req,
  });

  res.json({ message: "Документ өчүрүлдү." });
});

router.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: "Документ файлын жүктөө мүмкүн болгон жок." });
  }

  if (error) {
    return res.status(400).json({ message: error.message || "Документти жүктөөдө ката кетти." });
  }

  return res.status(500).json({ message: "Ички сервердик ката." });
});

module.exports = router;
