const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT_DIR, "data"));
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEV_JWT_SECRET = "document-workflow-secret";

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET || "";
  if (IS_PRODUCTION && (secret.length < 32 || secret === DEV_JWT_SECRET)) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters in production.");
  }
  return secret || DEV_JWT_SECRET;
}

module.exports = {
  IS_PRODUCTION,
  PORT: process.env.PORT || 4000,
  HOST: process.env.HOST || "0.0.0.0",
  JWT_SECRET: resolveJwtSecret(),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  // Number of reverse proxies in front of the app (Railway, Render, nginx); used for client IPs.
  TRUST_PROXY: process.env.TRUST_PROXY ?? (IS_PRODUCTION ? "1" : ""),
  // First administrator for an empty production database (demo users are created only in development).
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || "admin",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@college.local",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  DATA_DIR,
  DB_FILE: path.join(DATA_DIR, "eduflow.sqlite"),
  // How long a starting server waits for a previous instance to release the database.
  DB_LOCK_TIMEOUT_MS: Number(process.env.DB_LOCK_TIMEOUT_MS || (IS_PRODUCTION ? 30000 : 3000)),
  // Old JSON storage; imported into SQLite automatically on first start.
  LEGACY_JSON_FILE: path.join(DATA_DIR, "db.json"),
  BACKUP_DIR: path.resolve(process.env.BACKUP_DIR || path.join(DATA_DIR, "backups")),
  BACKUP_INTERVAL_HOURS: Number(process.env.BACKUP_INTERVAL_HOURS || 24),
  BACKUP_KEEP: Number(process.env.BACKUP_KEEP || 14),
  UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || path.join(ROOT_DIR, "uploads")),
  FRONTEND_DIST_DIR: path.resolve(ROOT_DIR, "..", "frontend", "dist"),
};
