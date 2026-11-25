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

/** "Дуйшенов Канат Райымбекович" → "К.Р. Дуйшенов". Names in any other form are left as they are. */
function formatSignerName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 3) {
    return parts.join(" ");
  }

  const [surname, second, third] = parts;
  if (/^(уулу|кызы)$/i.test(second)) {
    return `${third[0]}. ${surname} ${second}`;
  }

  return `${second[0]}.${third[0]}. ${surname}`;
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
  formatSignedAt,
  formatSignerName,
};
