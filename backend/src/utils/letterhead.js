const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("./config");

const BUNDLED_ASSETS_DIR = path.join(__dirname, "..", "..", "assets");
const BUNDLED_TEMPLATE_PATH = path.join(BUNDLED_ASSETS_DIR, "letterhead-template.pdf");
const LETTERHEAD_IMAGE_PATH = path.join(BUNDLED_ASSETS_DIR, "letterhead.png");

// Templates uploaded from the admin page live next to the database so they survive redeploys.
const CUSTOM_TEMPLATE_DIR = path.join(DATA_DIR, "letterhead");
const CUSTOM_TEMPLATE_PATH = path.join(CUSTOM_TEMPLATE_DIR, "letterhead-template.pdf");

/** The uploaded template if there is one, otherwise the template shipped with the code. */
function getLetterheadTemplatePath() {
  return fs.existsSync(CUSTOM_TEMPLATE_PATH) ? CUSTOM_TEMPLATE_PATH : BUNDLED_TEMPLATE_PATH;
}

function hasLetterheadTemplate() {
  return fs.existsSync(getLetterheadTemplatePath());
}

module.exports = {
  CUSTOM_TEMPLATE_DIR,
  CUSTOM_TEMPLATE_PATH,
  LETTERHEAD_IMAGE_PATH,
  getLetterheadTemplatePath,
  hasLetterheadTemplate,
};
