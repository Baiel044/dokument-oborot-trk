const fs = require("fs");
const path = require("path");
const { rgb } = require("pdf-lib");

const STAMP_LOGO_PATH = path.join(__dirname, "..", "..", "assets", "signature-logo.png");
const STAMP_LINES = ["ТАК санарип", "колтамга"];
const STAMP_COLOR = rgb(0, 0, 0.8);
const STAMP_HEIGHT = 64;
const LOGO_SIZE = 52;
const PADDING = 8;
const TEXT_FONT_SIZE = 12;
const NAME_FONT_SIZE = 14;
const COLLEGE_TIME_ZONE = "Asia/Bishkek";

const KYRGYZ_PATRONYMIC = /^(уулу|кызы)$/i;
const RUSSIAN_PATRONYMIC = /(вич|вна|ична)$/i;

/**
 * Reads a three-part name typed in either order:
 * "Бактыбек уулу Байэл" or "Байэл Бактыбек уулу", "Дуйшенов Канат Райымбекович" or "Канат Райымбекович Дуйшенов".
 * Returns null for names it cannot read, which are then shown as typed.
 */
function parseName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 3) {
    return null;
  }

  const [first, second, third] = parts;
  if (KYRGYZ_PATRONYMIC.test(second)) {
    return { surname: `${first} ${second}`, given: third, patronymic: "" };
  }
  if (KYRGYZ_PATRONYMIC.test(third)) {
    return { surname: `${second} ${third}`, given: first, patronymic: "" };
  }
  if (RUSSIAN_PATRONYMIC.test(second)) {
    return { surname: third, given: first, patronymic: second };
  }
  return { surname: first, given: second, patronymic: third };
}

/** Full name in the Kyrgyz order: "Бактыбек уулу Байэл", "Дуйшенов Канат Райымбекович". */
function formatFullName(fullName) {
  const name = parseName(fullName);
  if (!name) {
    return String(fullName || "").trim().split(/\s+/).filter(Boolean).join(" ");
  }
  return [name.surname, name.given, name.patronymic].filter(Boolean).join(" ");
}

/** Initials and surname: "К.Р. Дуйшенов", "Б. Бактыбек уулу". */
function formatSignerName(fullName) {
  const name = parseName(fullName);
  if (!name) {
    return formatFullName(fullName);
  }
  const initials = [name.given, name.patronymic].filter(Boolean).map((part) => `${part[0]}.`).join("");
  return `${initials} ${name.surname}`;
}

/** The server runs in UTC, so the college time zone is always set explicitly. */
function formatSignedAt(value) {
  return new Date(value).toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: COLLEGE_TIME_ZONE,
  });
}

/** Draws the framed signature stamp: college logo on the left, "ТАК санарип колтамга" and the signer on the right. */
async function drawSignatureStamp({ pdfDoc, page, font, toPdfText, x, topY, maxWidth, signerName }) {
  const textX = x + PADDING + LOGO_SIZE + PADDING;
  const maxTextWidth = maxWidth - (textX - x) - PADDING;
  const lines = [
    ...STAMP_LINES.map((line) => ({ text: toPdfText(line), size: TEXT_FONT_SIZE })),
    { text: toPdfText(formatSignerName(signerName)), size: NAME_FONT_SIZE },
  ].map((line) => {
    const lineWidth = font.widthOfTextAtSize(line.text, line.size);
    return lineWidth > maxTextWidth ? { ...line, size: (line.size * maxTextWidth) / lineWidth } : line;
  });

  const textWidth = Math.max(...lines.map((line) => font.widthOfTextAtSize(line.text, line.size)));
  const width = Math.min(maxWidth, textX - x + textWidth + PADDING);

  page.drawRectangle({
    x,
    y: topY - STAMP_HEIGHT,
    width,
    height: STAMP_HEIGHT,
    borderWidth: 1.5,
    borderColor: STAMP_COLOR,
  });

  if (fs.existsSync(STAMP_LOGO_PATH)) {
    const logo = await pdfDoc.embedPng(fs.readFileSync(STAMP_LOGO_PATH));
    page.drawImage(logo, {
      x: x + PADDING,
      y: topY - STAMP_HEIGHT + (STAMP_HEIGHT - LOGO_SIZE) / 2,
      width: LOGO_SIZE,
      height: LOGO_SIZE,
    });
  }

  [19, 34, 53].forEach((offset, index) => {
    page.drawText(lines[index].text, {
      x: textX,
      y: topY - offset,
      size: lines[index].size,
      font,
      color: STAMP_COLOR,
    });
  });

  return { width, height: STAMP_HEIGHT };
}

module.exports = {
  COLLEGE_TIME_ZONE,
  STAMP_HEIGHT,
  drawSignatureStamp,
  formatFullName,
  formatSignedAt,
  formatSignerName,
};
