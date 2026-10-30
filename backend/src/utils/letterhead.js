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

/**
 * Finds the horizontal separator line under the letterhead (the lowest wide line
 * in the top half of the page) and returns the Y where the text should start.
 */
function getTemplateContentStartY(page) {
  let content;
  try {
    content = readPageContent(page);
  } catch {
    return TEMPLATE_CONTENT_START_Y;
  }

  const { width, height } = page.getSize();
  const lineRegex = /(-?[\d.]+)\s+(-?[\d.]+)\s+m\s+(-?[\d.]+)\s+(-?[\d.]+)\s+l/g;
  let separatorY = null;

  for (const match of content.matchAll(lineRegex)) {
    const [x1, y1, x2, y2] = match.slice(1, 5).map(Number);
    const isHorizontal = Math.abs(y1 - y2) < 1;
    const isWide = Math.abs(x2 - x1) > width / 2;
    if (isHorizontal && isWide && y1 > height / 2 && (separatorY === null || y1 < separatorY)) {
      separatorY = y1;
    }
  }

  return separatorY === null ? TEMPLATE_CONTENT_START_Y : separatorY - TEMPLATE_LINE_GAP;
}

module.exports = {
  CUSTOM_TEMPLATE_DIR,
  CUSTOM_TEMPLATE_PATH,
  LETTERHEAD_IMAGE_PATH,
  getLetterheadTemplatePath,
  getTemplateContentStartY,
  hasLetterheadTemplate,
};
