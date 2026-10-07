const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eduflow-store-"));
process.env.DATA_DIR = path.join(TEST_DIR, "data");
process.env.UPLOAD_DIR = path.join(TEST_DIR, "uploads");
process.env.BACKUP_KEEP = "2";

const store = require("../src/data/store");
const { createDocumentNumber } = require("../src/utils/documentNumbering");
const { onNewNotification } = require("../src/realtime/notificationsHub");
const config = require("../src/utils/config");

function resetStorage() {
  store.closeStorage();
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(config.DATA_DIR, { recursive: true });
}

beforeEach(resetStorage);
after(() => {
  store.closeStorage();
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

test("seeds a new database with default users", () => {
  const db = store.readDb();
  assert.equal(db.users.length, 6);
  assert.ok(db.users.some((user) => user.username === "admin"));
  assert.ok(fs.existsSync(config.DB_FILE));
});

test("parallel requests do not overwrite each other's changes", () => {
  const first = store.readDb();
  const second = store.readDb();

  first.users.push({ id: "user-new", username: "new-user", status: "pending" });
  second.messages[0].isRead = true;

  store.writeDb(first);
  store.writeDb(second);

  const result = store.readDb();
  assert.ok(result.users.some((user) => user.id === "user-new"), "user added by first request is kept");
  assert.equal(result.messages[0].isRead, true, "message change from second request is kept");
});

test("an audit entry written during a request survives the request's own save", () => {
  const db = store.readDb();
  store.appendAuditLog({ userId: "user-admin", action: "login", entityType: "auth", entityId: "user-admin" });
  db.requests[0].status = "changed";
  store.writeDb(db);

  const result = store.readDb();
  assert.equal(result.auditLogs[0].action, "login");
  assert.equal(result.requests[0].status, "changed");
});

test("same record edited by two requests: different fields from the later save win per record", () => {
  const first = store.readDb();
  const second = store.readDb();
  first.users[0].phone = "111";
  second.users[1].phone = "222";
  store.writeDb(first);
  store.writeDb(second);

  const result = store.readDb();
  assert.equal(result.users[0].phone, "111");
  assert.equal(result.users[1].phone, "222");
});

test("removed records are deleted and stay deleted when another request edits them", () => {
  const remover = store.readDb();
  const editor = store.readDb();

  remover.users = remover.users.filter((user) => user.id !== "user-hr");
  store.writeDb(remover);

  editor.users.find((user) => user.id === "user-hr").phone = "999";
  store.writeDb(editor);

  assert.equal(store.readDb().users.some((user) => user.id === "user-hr"), false);
});

test("keeps the array order of unshift and push", () => {
  const db = store.readDb();
  db.auditLogs.unshift({ id: "audit-newest", action: "newest" });
  db.messages.push({ id: "msg-last", text: "last" });
  store.writeDb(db);

  const result = store.readDb();
  assert.equal(result.auditLogs[0].id, "audit-newest");
  assert.equal(result.messages.at(-1).id, "msg-last");
});

test("writing the same object twice applies only the new changes", () => {
  const db = store.readDb();
  db.documents.unshift({ id: "doc-1", title: "A" });
  store.writeDb(db);
  db.documents[0].title = "B";
  store.writeDb(db);

  const result = store.readDb();
  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0].title, "B");
});

test("data survives closing and reopening the database", () => {
  const db = store.readDb();
  db.documents.push({ id: "doc-persist", title: "Saved" });
  store.writeDb(db);

  store.closeStorage();
  assert.equal(store.readDb().documents[0].title, "Saved");
});

test("document numbers stay unique for parallel requests", () => {
  const first = store.readDb();
  const second = store.readDb();

  const a = createDocumentNumber(first, "orders");
  const b = createDocumentNumber(second, "orders");
  store.writeDb(first);
  store.writeDb(second);

  assert.notEqual(a.documentNumber, b.documentNumber);
  assert.deepEqual([a.documentNumber, b.documentNumber].sort(), ["№2/1", "№2/2"]);
  assert.equal(store.readDb().documentCounters["2"], 2);
});

test("publishes notifications that were added", () => {
  const received = [];
  const unsubscribe = onNewNotification((notification) => received.push(notification.id));
  const db = store.readDb();
  db.notifications.unshift({ id: "notif-new", userId: "user-admin", title: "Hi", isRead: false });
  db.notifications[1].isRead = true;
  store.writeDb(db);
  unsubscribe();

  assert.deepEqual(received, ["notif-new"]);
});

test("imports an existing db.json once and archives it", () => {
  const legacy = {
    users: [{ id: "user-legacy", username: "legacy" }],
    messages: [],
    requests: [],
    documents: [{ id: "doc-legacy", documentNumber: "№1/7" }],
    notifications: [],
    auditLogs: [],
    documentCounters: { 1: 7 },
  };
  fs.writeFileSync(config.LEGACY_JSON_FILE, JSON.stringify(legacy));

  const db = store.readDb();
  assert.deepEqual(db.users.map((user) => user.id), ["user-legacy"]);
  assert.equal(db.documentCounters["1"], 7);
  assert.equal(fs.existsSync(config.LEGACY_JSON_FILE), false);
  assert.ok(fs.readdirSync(config.DATA_DIR).some((name) => name.startsWith("db.json.migrated-")));
});

test("backup creates a database copy, mirrors uploads and keeps only the newest copies", () => {
  const { runBackup, listDatabaseBackups } = require("../src/data/backup");
  store.readDb();
  fs.mkdirSync(path.join(config.UPLOAD_DIR, "avatars"), { recursive: true });
  fs.writeFileSync(path.join(config.UPLOAD_DIR, "avatars", "a.png"), "x");

  const first = runBackup();
  assert.ok(fs.existsSync(first.databaseFile));
  assert.equal(first.copiedUploads, 1);
  assert.ok(fs.existsSync(path.join(config.BACKUP_DIR, "uploads", "avatars", "a.png")));

  // Backups are named by second; fake older ones to test pruning.
  ["2020-01-01_00-00-00", "2020-01-02_00-00-00"].forEach((stamp, index) => {
    const file = path.join(config.BACKUP_DIR, `eduflow-${stamp}.sqlite`);
    fs.copyFileSync(first.databaseFile, file);
    const time = new Date(2020, 0, index + 1);
    fs.utimesSync(file, time, time);
  });

  const second = runBackup();
  assert.equal(second.copiedUploads, 0, "unchanged uploads are not copied again");
  assert.equal(listDatabaseBackups().length, 2);
});
