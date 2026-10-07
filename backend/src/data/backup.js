const fs = require("fs");
const path = require("path");
const { BACKUP_DIR, BACKUP_INTERVAL_HOURS, BACKUP_KEEP, UPLOAD_DIR } = require("../utils/config");
const { getDatabase } = require("./store");

/*
 * Backups:
 *  - the SQLite database is copied with VACUUM INTO (a consistent snapshot, safe while the server runs)
 *    to backups/eduflow-YYYY-MM-DD_HH-MM-SS.sqlite; only the newest BACKUP_KEEP copies are kept;
 *  - uploaded files are mirrored to backups/uploads (files are never changed after upload,
 *    so only new files are copied and nothing is deleted from the mirror).
 */

const DB_BACKUP_PATTERN = /^eduflow-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(-\d+)?\.sqlite$/;
const CHECK_EVERY_MS = 60 * 60 * 1000;

function timestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_` +
    `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  );
}

function listDatabaseBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  return fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => DB_BACKUP_PATTERN.test(name))
    .map((name) => {
      const filePath = path.join(BACKUP_DIR, name);
      const stats = fs.statSync(filePath);
      return { name, filePath, size: stats.size, createdAt: stats.mtime };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

function backupDatabase() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = timestamp();
  let target = path.join(BACKUP_DIR, `eduflow-${stamp}.sqlite`);
  for (let attempt = 1; fs.existsSync(target); attempt += 1) {
    target = path.join(BACKUP_DIR, `eduflow-${stamp}-${attempt}.sqlite`);
  }
  const escapedTarget = target.replace(/'/g, "''");
  getDatabase().exec(`VACUUM INTO '${escapedTarget}'`);
  return target;
}

function mirrorDirectory(source, target) {
  if (!fs.existsSync(source)) {
    return 0;
  }

  fs.mkdirSync(target, { recursive: true });
  let copied = 0;

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copied += mirrorDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      const sourceStats = fs.statSync(sourcePath);
      const targetStats = fs.existsSync(targetPath) ? fs.statSync(targetPath) : null;
      if (!targetStats || targetStats.size !== sourceStats.size) {
        fs.copyFileSync(sourcePath, targetPath);
        copied += 1;
      }
    }
  }

  return copied;
}

function pruneDatabaseBackups(keep = BACKUP_KEEP) {
  const removed = [];
  listDatabaseBackups()
    .slice(Math.max(1, keep))
    .forEach((backup) => {
      fs.rmSync(backup.filePath, { force: true });
      removed.push(backup.name);
    });
  return removed;
}

function runBackup() {
  const databaseFile = backupDatabase();
  const copiedUploads = mirrorDirectory(UPLOAD_DIR, path.join(BACKUP_DIR, "uploads"));
  const removed = pruneDatabaseBackups();
  return { databaseFile, copiedUploads, removed };
}

function isBackupDue() {
  const [latest] = listDatabaseBackups();
  if (!latest) {
    return true;
  }
  return Date.now() - latest.createdAt.getTime() >= BACKUP_INTERVAL_HOURS * 60 * 60 * 1000;
}

function runBackupIfDue() {
  if (!isBackupDue()) {
    return null;
  }

  try {
    const result = runBackup();
    console.log(
      `[backup] ${path.basename(result.databaseFile)} created, ${result.copiedUploads} uploaded file(s) copied` +
        (result.removed.length ? `, ${result.removed.length} old backup(s) removed` : "")
    );
    return result;
  } catch (error) {
    console.error("[backup] Backup failed:", error);
    return null;
  }
}

function scheduleBackups() {
  if (!(BACKUP_INTERVAL_HOURS > 0)) {
    console.log("[backup] Automatic backups are disabled (BACKUP_INTERVAL_HOURS <= 0).");
    return null;
  }

  runBackupIfDue();
  const timer = setInterval(runBackupIfDue, CHECK_EVERY_MS);
  timer.unref();
  return timer;
}

module.exports = {
  listDatabaseBackups,
  runBackup,
  runBackupIfDue,
  scheduleBackups,
};

if (require.main === module) {
  let result;
  try {
    result = runBackup();
  } catch (error) {
    if (error.code === "DATABASE_LOCKED") {
      console.error("The server is running, so it makes backups itself (see data/backups). Stop it to run a manual backup.");
      process.exit(1);
    }
    throw error;
  }
  console.log(`Backup created: ${result.databaseFile}`);
  console.log(`Uploaded files copied: ${result.copiedUploads}`);
  if (result.removed.length) {
    console.log(`Old backups removed: ${result.removed.join(", ")}`);
  }
}
