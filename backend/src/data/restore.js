/*
 * Restores the database from a backup.
 *
 *   npm --prefix backend run restore -- <backup file name or path>
 *   npm --prefix backend run restore            (lists available backups)
 *
 * Stop the server first. The current database is saved as backups/pre-restore-*.sqlite.
 */
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { BACKUP_DIR, DB_FILE, PORT } = require("../utils/config");

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith(".sqlite"))
    .sort()
    .reverse();
}

function validateBackup(filePath) {
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);
    if (!tables.includes("records") || !tables.includes("meta")) {
      throw new Error("This file is not an EduFlow backup (tables records/meta are missing).");
    }
    const { total } = db.prepare("SELECT COUNT(*) AS total FROM records WHERE collection = 'users'").get();
    if (!total) {
      throw new Error("The backup contains no users; refusing to restore it.");
    }
    return total;
  } finally {
    db.close();
  }
}

async function isServerRunning() {
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function main() {
  const argument = process.argv[2];

  if (!argument) {
    const backups = listBackups();
    console.log(backups.length ? `Available backups in ${BACKUP_DIR}:` : `No backups found in ${BACKUP_DIR}.`);
    backups.forEach((name) => console.log(`  ${name}`));
    console.log("\nUsage: npm --prefix backend run restore -- <backup file>");
    return;
  }

  const source = fs.existsSync(argument) ? path.resolve(argument) : path.join(BACKUP_DIR, argument);
  if (!fs.existsSync(source)) {
    throw new Error(`Backup not found: ${argument}`);
  }

  if (await isServerRunning()) {
    throw new Error(`The server is running on port ${PORT}. Stop it before restoring.`);
  }

  const users = validateBackup(source);

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safetyCopy = path.join(BACKUP_DIR, `pre-restore-${stamp}.sqlite`);
    const current = new DatabaseSync(DB_FILE);
    current.exec(`VACUUM INTO '${safetyCopy.replace(/'/g, "''")}'`);
    current.close();
    console.log(`Current database saved as ${safetyCopy}`);
  }

  ["-wal", "-shm"].forEach((suffix) => fs.rmSync(`${DB_FILE}${suffix}`, { force: true }));
  fs.copyFileSync(source, DB_FILE);
  console.log(`Restored ${path.basename(source)} (${users} users). Start the server again.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
