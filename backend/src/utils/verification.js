const { PUBLIC_SITE_URL } = require("./config");
const { formatFullName, formatSignerName } = require("./signatureStamp");
const { getRequestHeading } = require("./requestLetter");

const CODE_PATTERN = /^[0-9A-F]{16}$/;

/** Public page that confirms a signed document: printed as the QR code of the PDF. */
function buildVerificationUrl(signatureCode) {
  return `${PUBLIC_SITE_URL}/verify/${encodeURIComponent(signatureCode)}`;
}

/**
 * Finds a signed request by the code printed on its PDF and returns only what the paper
 * already shows, so the public page reveals nothing more than the document itself.
 */
function findSignedDocument(db, rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    return null;
  }

  const request = db.requests.find((item) => item.directorSignature?.signatureCode === code);
  if (!request) {
    return null;
  }

  const author = db.users.find((user) => user.id === request.userId);
  return {
    signatureCode: code,
    documentNumber: request.officialDocument?.documentNumber || request.documentNumber || "",
    heading: getRequestHeading(request.type),
    type: request.type,
    documentTitle: request.documentTitle,
    author: formatSignerName(author?.fullName),
    signedBy: formatFullName(request.directorSignature.signedBy),
    signedAt: request.directorSignature.signedAt,
    createdAt: request.createdAt,
  };
}

module.exports = { buildVerificationUrl, findSignedDocument };
