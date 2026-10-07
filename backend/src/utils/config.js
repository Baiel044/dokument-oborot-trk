const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT_DIR, "data"));

module.exports = {
  PORT: process.env.PORT || 4000,
  HOST: process.env.HOST || "0.0.0.0",
  JWT_SECRET: process.env.JWT_SECRET || "document-workflow-secret",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  DATA_DIR,
  DB_FILE: path.join(DATA_DIR, "eduflow.sqlite"),
  // Old JSON storage; imported into SQLite automatically on first start.
  LEGACY_JSON_FILE: path.join(DATA_DIR, "db.json"),
  BACKUP_DIR: path.resolve(process.env.BACKUP_DIR || path.join(DATA_DIR, "backups")),
  BACKUP_INTERVAL_HOURS: Number(process.env.BACKUP_INTERVAL_HOURS || 24),
  BACKUP_KEEP: Number(process.env.BACKUP_KEEP || 14),
  UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || path.join(ROOT_DIR, "uploads")),
  FRONTEND_DIST_DIR: path.resolve(ROOT_DIR, "..", "frontend", "dist"),
};
