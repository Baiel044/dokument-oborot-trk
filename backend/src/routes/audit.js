const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { appendAuditLog, readDb } = require("../data/store");

const router = express.Router();

function decorateAuditLog(log, users) {
  const actor = users.find((user) => user.id === log.userId);
  return {
    ...log,
    userName: actor?.fullName || "Белгисиз",
    userRoleCode: actor?.roleCode || null,
  };
}

function getAuditFilters(queryParams) {
  return {
    query: String(queryParams.q || "").trim().toLowerCase(),
    entityType: String(queryParams.entityType || "").trim(),
    userId: String(queryParams.userId || "").trim(),
    dateFrom: String(queryParams.dateFrom || "").trim(),
    dateTo: String(queryParams.dateTo || "").trim(),
    limit: Math.min(Math.max(Number(queryParams.limit) || 100, 1), 500),
  };
}

function filterAuditLogs(db, filters) {
  return db.auditLogs
    .map((log) => decorateAuditLog(log, db.users))
    .filter((log) => {
      if (filters.entityType && log.entityType !== filters.entityType) {
        return false;
      }

      if (filters.userId && log.userId !== filters.userId) {
        return false;
      }

      if (filters.dateFrom && new Date(log.createdAt) < new Date(`${filters.dateFrom}T00:00:00.000Z`)) {
        return false;
      }

      if (filters.dateTo && new Date(log.createdAt) > new Date(`${filters.dateTo}T23:59:59.999Z`)) {
        return false;
      }

      if (!filters.query) {
        return true;
      }

      return [
        log.action,
        log.entityType,
        log.entityId,
        log.userName,
        log.userRoleCode,
        log.ipAddress,
        log.userAgent,
        log.metadata ? JSON.stringify(log.metadata) : "",
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(filters.query));
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, filters.limit);
}

function escapeCsvValue(value) {
  let text = String(value ?? "");
  // Spreadsheet apps execute cells starting with these characters as formulas (CSV injection).
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildAuditCsv(auditLogs) {
  const rows = [
    ["createdAt", "user", "role", "action", "entityType", "entityId", "ipAddress", "userAgent", "metadata"],
    ...auditLogs.map((log) => [
      log.createdAt,
      log.userName || log.userId,
      log.userRoleCode || "",
      log.action,
      log.entityType,
      log.entityId,
      log.ipAddress || "",
      log.userAgent || "",
      log.metadata ? JSON.stringify(log.metadata) : "",
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(escapeCsvValue).join(";")).join("\r\n")}\r\n`;
}

router.get("/export.csv", authenticate, authorize("ADMIN", "DIRECTOR"), (req, res) => {
  const db = readDb();
  const auditLogs = filterAuditLogs(db, getAuditFilters(req.query));
  const csv = buildAuditCsv(auditLogs);
  const fileName = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

  appendAuditLog({
    userId: req.user.id,
    action: "Журнал действий выгружен в CSV",
    entityType: "audit",
    entityId: "export.csv",
    req,
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(csv);
});

router.get("/", authenticate, authorize("ADMIN", "DIRECTOR"), (req, res) => {
  const db = readDb();
  const filters = getAuditFilters(req.query);
  const auditLogs = filterAuditLogs(db, filters);
  const entityTypes = [...new Set(db.auditLogs.map((log) => log.entityType).filter(Boolean))].sort();

  res.json({ auditLogs, entityTypes });
});

module.exports = router;
