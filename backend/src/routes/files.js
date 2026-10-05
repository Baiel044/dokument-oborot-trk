const express = require("express");
const fs = require("fs");
const path = require("path");
const { authenticate } = require("../middleware/auth");
const { appendAuditLog, readDb } = require("../data/store");
const { UPLOAD_DIR } = require("../utils/config");

const router = express.Router();

function getFileName(filePath) {
  return path.basename(String(filePath || ""));
}

function matchesFile(recordFilePath, fileName) {
  return getFileName(recordFilePath) === fileName;
}

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

  if (document.assignedRoleCode === user.roleCode || document.assignedToRole === user.roleCode) {
    return true;
  }

  if (document.departmentId && document.departmentId === user.departmentId) {
    return true;
  }

  return (document.assignments || []).some(
    (assignment) => assignment.recipientId === user.id || assignment.senderId === user.id
  );
}

function getOfficialPdfPath(document) {
  if (typeof document.officialPdf === "string") {
    return document.officialPdf;
  }

  return document.officialPdf?.filePath || "";
}

function getMatchedDocumentFile(document, fileName) {
  if (matchesFile(document.filePath, fileName)) {
    return {
      originalName: document.fileName || document.title,
      fileKind: "primary",
    };
  }

  if (matchesFile(document.officialDocument?.filePath, fileName) || matchesFile(document.officialDocument?.fileName, fileName)) {
    return {
      originalName: document.officialDocument?.originalTitle || document.officialDocument?.fileName || document.title,
      fileKind: "official-document",
    };
  }

  if (matchesFile(getOfficialPdfPath(document), fileName)) {
    return {
      originalName: document.officialPdf?.originalTitle || document.officialPdf?.fileName || document.title,
      fileKind: "official-pdf",
    };
  }

  const attachedFile = (document.files || []).find(
    (item) => matchesFile(item.filePath, fileName) || matchesFile(item.fileName, fileName)
  );

  if (attachedFile) {
    return {
      originalName: attachedFile.fileName || attachedFile.originalTitle || document.title,
      fileKind: "document-attachment",
    };
  }

  return null;
}

function findFileAccess(db, user, fileName) {
  const request = db.requests.find(
    (item) =>
      matchesFile(item.attachment?.filePath, fileName) ||
      matchesFile(item.officialDocument?.filePath, fileName)
  );

  if (request) {
    return {
      allowed: canViewRequest(user, request),
      entityType: "request-file",
      entityId: request.id,
      originalName:
        matchesFile(request.attachment?.filePath, fileName)
          ? request.attachment?.fileName
          : request.officialDocument?.originalTitle || request.officialDocument?.fileName,
    };
  }

  const document = db.documents.find((item) => getMatchedDocumentFile(item, fileName));
  if (document) {
    const matchedFile = getMatchedDocumentFile(document, fileName);

    return {
      allowed: canViewDocument(user, document),
      entityType: matchedFile.fileKind,
      entityId: document.id,
      originalName: matchedFile.originalName,
    };
  }

  return null;
}

router.get("/:fileName", authenticate, (req, res) => {
  const fileName = path.basename(req.params.fileName || "");
  if (!fileName || fileName !== req.params.fileName) {
    return res.status(400).json({ message: "Некорректное имя файла." });
  }

  const db = readDb();
  const access = findFileAccess(db, req.user, fileName);

  if (!access) {
    return res.status(404).json({ message: "Файл не найден в системе." });
  }

  if (!access.allowed) {
    return res.status(403).json({ message: "Недостаточно прав для просмотра файла." });
  }

  const absolutePath = path.join(UPLOAD_DIR, fileName);
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ message: "Файл отсутствует на сервере." });
  }

  appendAuditLog({
    userId: req.user.id,
    action: "Файл документа открыт",
    entityType: access.entityType,
    entityId: access.entityId,
    req,
  });

  if (access.originalName) {
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(access.originalName)}"`);
  }

  return res.sendFile(absolutePath);
});

module.exports = router;
