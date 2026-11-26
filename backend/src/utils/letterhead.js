const fs = require("fs");
const path = require("path");
const { PDFArray, PDFRawStream, decodePDFRawStream } = require("pdf-lib");
const { DATA_DIR } = require("./config");

const BUNDLED_ASSETS_DIR = path.join(__dirname, "..", "..", "assets");
const BUNDLED_TEMPLATE_PATH = path.join(BUNDLED_ASSETS_DIR, "letterhead-template.pdf");
const LETTERHEAD_IMAGE_PATH = path.join(BUNDLED_ASSETS_DIR, "letterhead.png");

// Templates uploaded from the admin page live next to the database so they survive redeploys.
const CUSTOM_TEMPLATE_DIR = path.join(DATA_DIR, "letterhead");
const CUSTOM_TEMPLATE_PATH = path.join(CUSTOM_TEMPLATE_DIR, "letterhead-template.pdf");

// Used when the separator line under the letterhead cannot be found in the template.
const TEMPLATE_CONTENT_START_Y = 420;
// Distance from the letterhead separator line to the first line of text.
const TEMPLATE_LINE_GAP = 28;

/** The uploaded template if there is one, otherwise the template shipped with the code. */
function getLetterheadTemplatePath() {
  return fs.existsSync(CUSTOM_TEMPLATE_PATH) ? CUSTOM_TEMPLATE_PATH : BUNDLED_TEMPLATE_PATH;
}

function hasLetterheadTemplate() {
  return fs.existsSync(getLetterheadTemplatePath());
}

function readPageContent(page) {
  const contents = page.node.Contents();
  if (!contents) {
    return "";
  }

  const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
  return refs
    .map((ref) => {
      const stream = page.doc.context.lookup(ref);
      if (!(stream instanceof PDFRawStream)) {
        return "";
      }
      return Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
    })
    .join("\n");
}

/** The horizontal separator line under the letterhead: the lowest wide line in the top half of the page. */
function findSeparatorLine(page) {
  let content;
  try {
    content = readPageContent(page);
  } catch {
    return null;
  }

  const { width, height } = page.getSize();
  const lineRegex = /(-?[\d.]+)\s+(-?[\d.]+)\s+m\s+(-?[\d.]+)\s+(-?[\d.]+)\s+l/g;
  let separator = null;

  for (const match of content.matchAll(lineRegex)) {
    const [x1, y1, x2, y2] = match.slice(1, 5).map(Number);
    const isHorizontal = Math.abs(y1 - y2) < 1;
    const isWide = Math.abs(x2 - x1) > width / 2;
    if (isHorizontal && isWide && y1 > height / 2 && (separator === null || y1 < separator.y)) {
      separator = { y: y1, left: Math.min(x1, x2), right: Math.max(x1, x2) };
    }
  }
  return separator;
}

/** Y where the text should start: right under the letterhead separator line. */
function getTemplateContentStartY(page) {
  const separator = findSeparatorLine(page);
  return separator ? separator.y - TEMPLATE_LINE_GAP : TEMPLATE_CONTENT_START_Y;
}

/**
 * Text area under the letterhead: it starts under the separator line and lines up with
 * both of its ends, so the text never sticks out past the line.
 */
function getTemplateContentBox(page, fallbackMargin) {
  const separator = findSeparatorLine(page);
  const { width } = page.getSize();
  if (!separator) {
    return { startY: TEMPLATE_CONTENT_START_Y, left: fallbackMargin, right: width - fallbackMargin };
  }
  return { startY: separator.y - TEMPLATE_LINE_GAP, left: separator.left, right: separator.right };
}

module.exports = {
  CUSTOM_TEMPLATE_DIR,
  CUSTOM_TEMPLATE_PATH,
  LETTERHEAD_IMAGE_PATH,
  getLetterheadTemplatePath,
  getTemplateContentBox,
  getTemplateContentStartY,
  hasLetterheadTemplate,
};
