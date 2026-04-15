const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { DATA_FILE, UPLOAD_DIR } = require("../utils/config");

const now = new Date().toISOString();

function buildSeed() {
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
      }
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
      }
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
      }
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
      }
    ],
    auditLogs: [
      {
        id: "audit-seed-1",
        userId: "user-admin",
        action: "Система инициализирована",
        entityType: "system",
        entityId: "bootstrap",
        createdAt: now,
      }
    ],
  };
}

function ensureStorage() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(buildSeed(), null, 2), "utf8");
  }
}

function readDb() {
  ensureStorage();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeDb(data) {
  ensureStorage();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function createId(prefix) {
  return `${prefix}-${uuidv4()}`;
}

function appendAuditLog({ userId, action, entityType, entityId }) {
  const db = readDb();
  db.auditLogs.unshift({
    id: createId("audit"),
    userId,
    action,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
  });
  writeDb(db);
}

module.exports = {
  ensureStorage,
  readDb,
  writeDb,
  createId,
  appendAuditLog,
};
