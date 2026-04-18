const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { authenticate } = require("../middleware/auth");
const { readDb, writeDb, createId, appendAuditLog } = require("../data/store");
const { UPLOAD_DIR } = require("../utils/config");
const { DOCUMENT_CATEGORIES } = require("../utils/catalogs");
const { generateLetterheadDocumentPdf } = require("../utils/letterheadDocumentPdf");

const router = express.Router();
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
const ASSIGNMENT_TYPES = ["execution", "review"];

function decorateDocument(document, users) {
  const uploader = users.find((user) => user.id === document.uploadedBy);
  return {
    ...document,
    uploadedByName: uploader?.fullName || "Белгисиз",
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

router.get("/", authenticate, (req, res) => {
  const db = readDb();
  const documents = [...db.documents]
    .filter((document) => {
      if (["ADMIN", "DIRECTOR"].includes(req.user.roleCode)) {
        return true;
      }

      const assignments = Array.isArray(document.assignments) ? document.assignments : [];
      return document.uploadedBy === req.user.id || assignments.some((item) => item.recipientId === req.user.id);
    })
    .map((document) => decorateDocument(document, db.users))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ documents });
});

router.post("/", authenticate, upload.single("file"), (req, res) => {
  const title = String(req.body.title || "").trim();
  const category = String(req.body.category || "").trim();
  const description = String(req.body.description || "").trim();

  if (!req.file) {
    return res.status(400).json({ message: "Документ файлын жүктөңүз." });
  }

  if (!DOCUMENT_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: "Документтин туура категориясын тандаңыз." });
  }

  const db = readDb();
  const createdAt = new Date().toISOString();
  const document = {
    id: createId("doc"),
    title: title || req.file.originalname,
    filePath: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    uploadedBy: req.user.id,
    category,
    description,
    createdAt,
  };

  db.documents.unshift(document);
  writeDb(db);

  appendAuditLog({
    userId: req.user.id,
    action: "Документ жүктөлдү",
    entityType: "document",
    entityId: document.id,
  });

  res.status(201).json({ document });
});

router.post("/generate-letterhead", authenticate, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const category = String(req.body.category || "").trim();
    const description = String(req.body.description || "").trim();

    if (!title) {
      return res.status(400).json({ message: "Документтин аталышын жазыңыз." });
    }

    if (!DOCUMENT_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Документтин туура категориясын тандаңыз." });
    }

    const db = readDb();
    const createdAt = new Date().toISOString();
    const categoryTitles = {
      orders: "Приказы",
      statements: "Заявления",
      reports: "Отчёты",
    };

    const generatedFile = await generateLetterheadDocumentPdf({
      title,
      categoryTitle: categoryTitles[category] || category,
      description,
      author: req.user,
    });

    const document = {
      id: createId("doc"),
      title,
      filePath: generatedFile.filePath,
      fileName: generatedFile.originalTitle,
      uploadedBy: req.user.id,
      category,
      description,
      createdAt,
      generatedOnLetterhead: true,
    };

    db.documents.unshift(document);
    writeDb(db);

    appendAuditLog({
      userId: req.user.id,
      action: "Документ фирмалык бланкта түзүлдү",
      entityType: "document",
      entityId: document.id,
    });

    return res.status(201).json({ document });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Фирмалык бланкта документ түзүүдө ката кетти." });
  }
});

router.get("/:id", authenticate, (req, res) => {
  const db = readDb();
  const document = db.documents.find((item) => item.id === req.params.id);

  if (!document) {
    return res.status(404).json({ message: "Документ табылган жок." });
  }

  res.json({ document: decorateDocument(document, db.users) });
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
    isRead: false,
    createdAt,
  });

  writeDb(db);
  appendAuditLog({
    userId: req.user.id,
    action: "Документ жөнөтүлдү",
    entityType: "document",
    entityId: document.id,
  });

  res.status(201).json({ document: decorateDocument(document, db.users) });
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
