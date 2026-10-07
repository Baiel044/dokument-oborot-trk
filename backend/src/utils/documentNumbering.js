const { reserveCounterValue } = require("../data/store");

const DOCUMENT_TYPE_CODES = {
  statements: 1,
  orders: 2,
  certificates: 3,
  incoming: 4,
  outgoing: 5,
  report: 6,
  reports: 6,
};

function getDocumentTypeCode(category) {
  return DOCUMENT_TYPE_CODES[category] || 1;
}

function parseDocumentNumber(value) {
  const match = String(value || "").match(/^№(\d+)\/(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    documentTypeCode: Number(match[1]),
    sequenceNumber: Number(match[2]),
  };
}

function getHighestExistingSequence(db, documentTypeCode) {
  return (db.documents || []).reduce((highest, document) => {
    const parsed = parseDocumentNumber(document.documentNumber);
    if (!parsed || parsed.documentTypeCode !== documentTypeCode) {
      return highest;
    }

    return Math.max(highest, parsed.sequenceNumber);
  }, 0);
}

function normalizeStoredCounters(db) {
  if (!db.documentCounters || typeof db.documentCounters !== "object" || Array.isArray(db.documentCounters)) {
    db.documentCounters = {};
  }

  return db.documentCounters;
}

function syncCounter(db, documentNumberInfo) {
  const counters = normalizeStoredCounters(db);
  const key = String(documentNumberInfo.documentTypeCode);
  counters[key] = Math.max(Number(counters[key] || 0), documentNumberInfo.sequenceNumber);
}

function createDocumentNumber(db, category) {
  const documentTypeCode = getDocumentTypeCode(category);
  const counters = normalizeStoredCounters(db);
  const counterKey = String(documentTypeCode);
  // Reserved in the database right away, so parallel requests never share a number.
  const sequenceNumber = reserveCounterValue(
    "documentCounters",
    counterKey,
    Math.max(Number(counters[counterKey] || 0), getHighestExistingSequence(db, documentTypeCode))
  );

  counters[counterKey] = sequenceNumber;

  return {
    documentNumber: `№${documentTypeCode}/${sequenceNumber}`,
    documentTypeCode,
    sequenceNumber,
  };
}

function getOrCreateDocumentNumber(db, category, existingDocument) {
  const parsed = parseDocumentNumber(existingDocument?.documentNumber);
  if (parsed) {
    const documentNumberInfo = {
      documentNumber: existingDocument.documentNumber,
      documentTypeCode: existingDocument.documentTypeCode || parsed.documentTypeCode,
      sequenceNumber: existingDocument.sequenceNumber || existingDocument.documentSequence || parsed.sequenceNumber,
    };
    syncCounter(db, documentNumberInfo);
    return documentNumberInfo;
  }

  return createDocumentNumber(db, category);
}

module.exports = {
  createDocumentNumber,
  getOrCreateDocumentNumber,
  getDocumentTypeCode,
};
