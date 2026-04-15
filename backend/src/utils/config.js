const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");

module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || "document-workflow-secret",
  DATA_FILE: path.join(ROOT_DIR, "data", "db.json"),
  UPLOAD_DIR: path.join(ROOT_DIR, "uploads"),
};
