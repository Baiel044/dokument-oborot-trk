const path = require("path");

const DOCUMENT_MIME_TYPES_BY_EXTENSION = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
};

const DOCUMENT_EXTENSIONS = Object.keys(DOCUMENT_MIME_TYPES_BY_EXTENSION);

function isAllowedDocumentFile(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const allowedMimeTypes = DOCUMENT_MIME_TYPES_BY_EXTENSION[extension] || [];
  return allowedMimeTypes.includes(file.mimetype);
}

function isAllowedPdfFile(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  return extension === ".pdf" && file.mimetype === "application/pdf";
}

module.exports = {
  DOCUMENT_EXTENSIONS,
  isAllowedDocumentFile,
  isAllowedPdfFile,
};
