const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");
const { v4: uuidv4 } = require("uuid");
const { DATA_DIR, DB_FILE, LEGACY_JSON_FILE, UPLOAD_DIR } = require("../utils/config");
const { publishNotifications } = require("../realtime/notificationsHub");

/*
 * Storage layer.
 *
 * Data lives in SQLite (one row per record, plus a small key/value "meta" table)
 * and is mirrored in an in-memory cache. Routes keep the simple API they always had:
 *
 *   const db = readDb();   // plain object: { users: [...], documents: [...], ... }
 *   ...mutate db...
 *   writeDb(db);
 *
 * writeDb() does NOT overwrite the whole database. It compares the object with the
 * snapshot taken by readDb() and applies only the records that this request
 * added, changed or removed, inside one SQLite transaction. Two requests that
 * work in parallel (e.g. one awaits bcrypt or PDF generation) therefore no longer
 * erase each other's changes, and a crash in the middle of a write cannot leave a
 * half-written file behind.
 */

const DEFAULT_COLLECTIONS = ["users", "messages", "requests", "documents", "notifications", "auditLogs"];
const MAX_COUNTER_META_KEYS = new Set(["documentCounters"]);
const SCHEMA_VERSION = 1;

let database = null;
let cache = null;
const snapshots = new WeakMap();

function buildSeed() {
  const now = new Date().toISOString();

  return {
    users: [
      {
        id: "user-admin",
        fullName: "Системный администратор",
        email: "admin@college.local",
        phone: "+7 700 100 00 01",
        username: "admin",
        passwordHash: bcrypt.hashSync("admin123", 10),
        position: "Администратор системы",
        departmentId: "it",
        roleCode: "ADMIN",
        status: "active",
        createdAt: now,
        approvedAt: now,
      },
      {
        id: "user-director",
        fullName: "Дуйшенов Канат Райымбекович",
        email: "director@college.local",
        phone: "+7 700 100 00 02",
        username: "director",
        passwordHash: bcrypt.hashSync("director123", 10),
        position: "Директор",
        departmentId: "general",
        roleCode: "DIRECTOR",
        status: "active",
        createdAt: now,
        approvedAt: now,
      },
      {
        id: "user-teacher",
        fullName: "Бактыбек уулу Байэл",
        email: "teacher@college.local",
        phone: "+7 700 100 00 03",
        username: "teacher",
        passwordHash: bcrypt.hashSync("teacher123", 10),
        position: "Преподаватель",
        departmentId: "teaching",
        roleCode: "TEACHER",
        status: "active",
        createdAt: now,
        approvedAt: now,
      },
      {
        id: "user-academic",
        fullName: "Асранова Канышай Бабатаевна",
        email: "office@college.local",
        phone: "+7 700 100 00 04",
        username: "academic",
        passwordHash: bcrypt.hashSync("academic123", 10),
        position: "Учебная часть",
        departmentId: "academic-office",
        roleCode: "ACADEMIC_OFFICE",
        status: "active",
        createdAt: now,
        approvedAt: now,
      },
      {
        id: "user-hr",
        fullName: "Бадолотова Бермет",
        email: "hr@college.local",
        phone: "+7 700 100 00 05",
        username: "hr",
        passwordHash: bcrypt.hashSync("hr123456", 10),
        position: "Отдел кадров",
        departmentId: "hr",
        roleCode: "HR",
        status: "active",
        createdAt: now,
        approvedAt: now,
      },
      {
        id: "user-accountant",
        fullName: "Бадолотова Бермет",
        email: "accountant@college.local",
        phone: "+7 700 100 00 06",
        username: "accountant",
        passwordHash: bcrypt.hashSync("account123", 10),
        position: "Бухгалтер",
        departmentId: "accounting",
        roleCode: "ACCOUNTANT",
        status: "active",
        createdAt: now,
        approvedAt: now,
      },
    ],
    messages: [
      {
        id: "msg-seed-1",
        senderId: "user-director",
        receiverId: "user-teacher",
        subject: "Учебный план",
        text: "Просьба до конца дня загрузить обновлённый учебный план в систему.",
        isRead: false,
        audienceType: "direct",
        createdAt: now,
      },
    ],
    requests: [
      {
        id: "req-seed-1",
        userId: "user-teacher",
        type: "Обращение преподавателя",
        documentTitle: "Служебное обращение о переносе занятий",
        reason: "Просьба согласовать перенос занятий по семейным обстоятельствам.",
        comment: "Прошу направить документ после подписи директора в отдел кадров.",
        startDate: now.slice(0, 10),
        endDate: now.slice(0, 10),
        absenceTime: "Полный день",
        status: "На рассмотрении директора",
        initialRecipientRole: "DIRECTOR",
        currentRecipientRole: "DIRECTOR",
        directorComment: "",
        directorSignature: null,
        attachment: null,
        routeHistory: [
          {
            id: "route-seed-1",
            actorUserId: "user-teacher",
            actorName: "Бактыбек уулу Байэл",
            actorRoleCode: "TEACHER",
            actorRoleTitle: "Преподаватель",
            status: "На рассмотрении директора",
            targetRoleCode: "DIRECTOR",
            targetRoleTitle: "Директор",
            comment: "Прошу подписать и направить дальше.",
            signatureName: "",
            createdAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    documents: [],
    notifications: [
      {
        id: "notif-seed-1",
        userId: "user-director",
        title: "Новое заявление",
        text: "Преподаватель отправил заявление на рассмотрение.",
        isRead: false,
        createdAt: now,
      },
    ],
    auditLogs: [
      {
        id: "audit-seed-1",
        userId: "user-admin",
        action: "Система инициализирована",
        entityType: "system",
        entityId: "bootstrap",
        createdAt: now,
      },
    ],
  };
}

/* ---------- SQLite helpers ---------- */

function openDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_FILE);
  try {
    // Only one server process may own the database: the in-memory cache assumes it is the sole writer.
    db.exec(`
      PRAGMA busy_timeout = 3000;
      PRAGMA locking_mode = EXCLUSIVE;
      PRAGMA journal_mode = WAL;
      BEGIN IMMEDIATE;
      COMMIT;
    `);
  } catch (error) {
    db.close();
    if (/locked|busy/i.test(error.message)) {
      const lockedError = new Error(
        `The database ${DB_FILE} is already used by another running server. Stop it first (only one server may use the data folder).`
      );
      lockedError.code = "DATABASE_LOCKED";
      throw lockedError;
    }
    throw error;
  }
  db.exec(`
    PRAGMA synchronous = FULL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS records (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      ord REAL NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (collection, id)
    );
    CREATE INDEX IF NOT EXISTS records_collection_order ON records (collection, ord);

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  return db;
}

function prepareStatements(db) {
  return {
    insertRecord: db.prepare(
      "INSERT INTO records (collection, id, ord, data, updated_at) VALUES (?, ?, ?, ?, ?)"
    ),
    updateRecord: db.prepare("UPDATE records SET data = ?, updated_at = ? WHERE collection = ? AND id = ?"),
    updateOrder: db.prepare("UPDATE records SET ord = ? WHERE collection = ? AND id = ?"),
    deleteRecord: db.prepare("DELETE FROM records WHERE collection = ? AND id = ?"),
    upsertMeta: db.prepare(
      "INSERT INTO meta (key, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
    ),
    countRecords: db.prepare("SELECT COUNT(*) AS total FROM records"),
    allRecords: db.prepare("SELECT collection, id, ord, data FROM records ORDER BY collection, ord"),
    allMeta: db.prepare("SELECT key, data FROM meta"),
  };
}

let statements = null;

function transaction(work) {
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch (_rollbackError) {
      // The transaction may already be closed; nothing else to undo.
    }
    // The cache may have been partially updated; reload it from the committed state.
    loadCache();
    throw error;
  }
}

/* ---------- In-memory cache ---------- */

function emptyCollection() {
  return { order: [], byId: new Map() };
}

function getCollection(name) {
  if (!cache.collections.has(name)) {
    cache.collections.set(name, emptyCollection());
  }
  return cache.collections.get(name);
}

function loadCache() {
  cache = { collections: new Map(), meta: new Map() };
  DEFAULT_COLLECTIONS.forEach((name) => cache.collections.set(name, emptyCollection()));

  for (const row of statements.allRecords.all()) {
    const collection = getCollection(row.collection);
    collection.order.push(row.id);
    collection.byId.set(row.id, { json: row.data, ord: row.ord });
  }

  for (const row of statements.allMeta.all()) {
    cache.meta.set(row.key, row.data);
  }
}

/* ---------- Ordering ---------- */

function renumberCollection(name, collection) {
  collection.order.forEach((id, index) => {
    collection.byId.get(id).ord = index;
    statements.updateOrder.run(index, name, id);
  });
}

function computeInsertOrder(collection, afterId) {
  const { order, byId } = collection;

  if (!order.length) {
    return { index: 0, ord: 0 };
  }

  if (afterId === null) {
    return { index: 0, ord: byId.get(order[0]).ord - 1 };
  }

  const previousIndex = order.indexOf(afterId);
  const previousOrd = byId.get(afterId).ord;
  const nextId = order[previousIndex + 1];

  if (nextId === undefined) {
    return { index: previousIndex + 1, ord: previousOrd + 1 };
  }

  return { index: previousIndex + 1, ord: (previousOrd + byId.get(nextId).ord) / 2 };
}

function insertIntoCollection(name, collection, id, json, afterId, now) {
  let position = computeInsertOrder(collection, afterId);

  // Midpoint ordering eventually runs out of floating point precision; rebalance then.
  const neighbours = [collection.order[position.index - 1], collection.order[position.index]]
    .filter((item) => item !== undefined)
    .map((item) => collection.byId.get(item).ord);
  if (neighbours.some((ord) => Math.abs(ord - position.ord) < 1e-9)) {
    renumberCollection(name, collection);
    position = computeInsertOrder(collection, afterId);
  }

  statements.insertRecord.run(name, id, position.ord, json, now);
  collection.order.splice(position.index, 0, id);
  collection.byId.set(id, { json, ord: position.ord });
}

/* ---------- Merging a request's changes ---------- */

function mergeCollection(name, records, snapshot, now, inserted) {
  const collection = getCollection(name);
  const handlerIds = [];
  const handlerJson = new Map();

  records.forEach((record) => {
    if (!record || typeof record !== "object") {
      return;
    }
    if (record.id === undefined || record.id === null || record.id === "") {
      record.id = createId(name);
    }
    const id = String(record.id);
    if (handlerJson.has(id)) {
      return;
    }
    handlerIds.push(id);
    handlerJson.set(id, JSON.stringify(record));
  });

  // Records removed by this request.
  for (const id of snapshot.keys()) {
    if (!handlerJson.has(id) && collection.byId.has(id)) {
      statements.deleteRecord.run(name, id);
      collection.byId.delete(id);
      collection.order.splice(collection.order.indexOf(id), 1);
    }
  }

  // Records added or changed by this request.
  handlerIds.forEach((id, index) => {
    const json = handlerJson.get(id);
    const before = snapshot.get(id);
    const current = collection.byId.get(id);

    if (before === undefined && !current) {
      let afterId = null;
      for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        if (collection.byId.has(handlerIds[cursor])) {
          afterId = handlerIds[cursor];
          break;
        }
      }
      insertIntoCollection(name, collection, id, json, afterId, now);
      inserted.push({ collection: name, json });
      return;
    }

    if (before !== json && current && current.json !== json) {
      // A record deleted by another request in the meantime stays deleted.
      statements.updateRecord.run(json, now, name, id);
      current.json = json;
    }
  });

  return new Map(handlerIds.map((id) => [id, handlerJson.get(id)]));
}

function mergeMeta(key, value, snapshotJson, now) {
  const json = JSON.stringify(value === undefined ? null : value);
  if (json === snapshotJson) {
    return json;
  }

  let nextJson = json;
  if (MAX_COUNTER_META_KEYS.has(key) && value && typeof value === "object") {
    // Counters only grow: keep the highest value from every concurrent writer.
    const current = JSON.parse(cache.meta.get(key) || "{}");
    Object.entries(value).forEach(([counterKey, counterValue]) => {
      current[counterKey] = Math.max(Number(current[counterKey] || 0), Number(counterValue || 0));
    });
    nextJson = JSON.stringify(current);
  }

  if (cache.meta.get(key) !== nextJson) {
    statements.upsertMeta.run(key, nextJson, now);
    cache.meta.set(key, nextJson);
  }
  return json;
}

/* ---------- Public API ---------- */

function ensureStorage() {
  if (database) {
    return;
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  database = openDatabase();
  statements = prepareStatements(database);

  const isEmpty = statements.countRecords.get().total === 0 && statements.allMeta.all().length === 0;
  cache = { collections: new Map(), meta: new Map() };
  DEFAULT_COLLECTIONS.forEach((name) => cache.collections.set(name, emptyCollection()));

  if (isEmpty) {
    const legacyData = readLegacyJson();
    importData(legacyData || buildSeed());
    if (legacyData) {
      const archivedPath = `${LEGACY_JSON_FILE}.migrated-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      fs.renameSync(LEGACY_JSON_FILE, archivedPath);
      console.log(`[store] Imported ${path.basename(LEGACY_JSON_FILE)} into SQLite. Original kept as ${path.basename(archivedPath)}.`);
    }
  }

  loadCache();
}

function readLegacyJson() {
  if (!fs.existsSync(LEGACY_JSON_FILE)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(LEGACY_JSON_FILE, "utf8"));
}

function importData(data) {
  const now = new Date().toISOString();
  transaction(() => {
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((record, index) => {
          if (!record || typeof record !== "object") {
            return;
          }
          const id = String(record.id || createId(key));
          statements.insertRecord.run(key, id, index, JSON.stringify({ ...record, id }), now);
        });
      } else {
        statements.upsertMeta.run(key, JSON.stringify(value === undefined ? null : value), now);
      }
    });
  });
}

function readDb() {
  ensureStorage();
  const data = {};
  const snapshot = { collections: new Map(), meta: new Map() };

  for (const [name, collection] of cache.collections) {
    const records = new Array(collection.order.length);
    const snapshotRecords = new Map();
    collection.order.forEach((id, index) => {
      const { json } = collection.byId.get(id);
      records[index] = JSON.parse(json);
      snapshotRecords.set(id, json);
    });
    data[name] = records;
    snapshot.collections.set(name, snapshotRecords);
  }

  for (const [key, json] of cache.meta) {
    data[key] = JSON.parse(json);
    snapshot.meta.set(key, json);
  }

  snapshots.set(data, snapshot);
  return data;
}

function writeDb(data) {
  ensureStorage();
  const snapshot = snapshots.get(data) || { collections: new Map(), meta: new Map() };
  const now = new Date().toISOString();
  const inserted = [];
  const nextSnapshot = { collections: new Map(), meta: new Map(snapshot.meta) };

  transaction(() => {
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const previous = snapshot.collections.get(key) || new Map();
        nextSnapshot.collections.set(key, mergeCollection(key, value, previous, now, inserted));
      } else {
        nextSnapshot.meta.set(key, mergeMeta(key, value, snapshot.meta.get(key), now));
      }
    });
  });

  // A handler may call writeDb() again on the same object; only diff against what it already saved.
  snapshots.set(data, nextSnapshot);

  const newNotifications = inserted
    .filter((item) => item.collection === "notifications")
    .map((item) => JSON.parse(item.json));
  if (newNotifications.length) {
    publishNotifications(newNotifications);
  }
}

/**
 * Atomically reserves the next number in a counter (e.g. document numbers per type).
 * The reservation is committed immediately, so two parallel requests never get the same number.
 */
function reserveCounterValue(metaKey, counterKey, minimum = 0) {
  ensureStorage();
  const now = new Date().toISOString();
  return transaction(() => {
    const counters = JSON.parse(cache.meta.get(metaKey) || "{}");
    const next = Math.max(Number(counters[counterKey] || 0), Number(minimum || 0)) + 1;
    counters[counterKey] = next;
    const json = JSON.stringify(counters);
    statements.upsertMeta.run(metaKey, json, now);
    cache.meta.set(metaKey, json);
    return next;
  });
}

function createId(prefix) {
  return `${prefix}-${uuidv4()}`;
}

function getRequestIp(req) {
  const forwardedFor = req?.headers?.["x-forwarded-for"];
  return String(Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || req?.ip || "")
    .split(",")[0]
    .trim();
}

function appendAuditLog({ userId, action, entityType, entityId, req, metadata }) {
  ensureStorage();
  const entry = {
    id: createId("audit"),
    userId,
    action,
    entityType,
    entityId,
    ipAddress: req ? getRequestIp(req) : "",
    userAgent: req?.headers?.["user-agent"] || "",
    metadata: metadata || null,
    createdAt: new Date().toISOString(),
  };
  const now = entry.createdAt;
  transaction(() => {
    insertIntoCollection("auditLogs", getCollection("auditLogs"), entry.id, JSON.stringify(entry), null, now);
  });
}

function getDatabase() {
  ensureStorage();
  return database;
}

function closeStorage() {
  if (database) {
    database.close();
    database = null;
    statements = null;
    cache = null;
  }
}

module.exports = {
  ensureStorage,
  readDb,
  writeDb,
  createId,
  appendAuditLog,
  reserveCounterValue,
  getDatabase,
  closeStorage,
};
