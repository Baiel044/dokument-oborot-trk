const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { appendAuditLog, readDb } = require("../data/store");
const { getDepartmentTitle, getRoleTitle, normalizeRequestStatus } = require("../utils/catalogs");
const { buildSummaryPdf } = require("../utils/reportPdf");

const router = express.Router();

function getEffectiveDocumentCategory(document) {
  if (["statements", "orders", "certificates", "incoming", "outgoing", "reports"].includes(document.category)) {
    return document.category;
  }

  if (document.sourceRequestId || document.isOfficial) {
    return "statements";
  }

  return document.category || "statements";
}

function canViewRequest(user, request) {
  if (request.userId === user.id) {
    return true;
  }

  if (["ADMIN", "DIRECTOR"].includes(user.roleCode)) {
    return true;
  }

  if (request.currentRecipientRole === user.roleCode) {
    return true;
  }

  return (request.routeHistory || []).some(
    (step) => step.actorUserId === user.id || step.targetRoleCode === user.roleCode
  );
}

function canViewDocument(user, document) {
  if (["ADMIN", "DIRECTOR"].includes(user.roleCode)) {
    return true;
  }

  if (document.uploadedBy === user.id) {
    return true;
  }

  return (document.assignments || []).some(
    (assignment) => assignment.recipientId === user.id || assignment.senderId === user.id
  );
}

function filterAuditLogsForScope(db, user, visibleRequests, visibleDocuments, isGlobalScope) {
  if (isGlobalScope) {
    return db.auditLogs;
  }

  const visibleRequestIds = new Set(visibleRequests.map((item) => item.id));
  const visibleDocumentIds = new Set(visibleDocuments.map((item) => item.id));

  return db.auditLogs.filter((log) => {
    if (log.userId === user.id) {
      return true;
    }

    if (log.entityType === "request" && visibleRequestIds.has(log.entityId)) {
      return true;
    }

    if (log.entityType === "document" && visibleDocumentIds.has(log.entityId)) {
      return true;
    }

    return false;
  });
}

function addValidDate(target, value) {
  if (!value) {
    return;
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    target.push(date);
  }
}

function buildReportPeriod(visibleRequests, visibleDocuments, visibleAuditLogs, generatedAt) {
  const dates = [];

  visibleRequests.forEach((request) => {
    addValidDate(dates, request.createdAt);
    addValidDate(dates, request.updatedAt);
    addValidDate(dates, request.startDate);
    addValidDate(dates, request.endDate);
    addValidDate(dates, request.directorSignature?.signedAt);
    (request.routeHistory || []).forEach((step) => addValidDate(dates, step.createdAt));
  });

  visibleDocuments.forEach((document) => {
    addValidDate(dates, document.createdAt);
    addValidDate(dates, document.updatedAt);
    (document.assignments || []).forEach((assignment) => {
      addValidDate(dates, assignment.createdAt);
      addValidDate(dates, assignment.readAt);
      addValidDate(dates, assignment.completedAt);
      addValidDate(dates, assignment.updatedAt);
    });
  });

  if (!dates.length) {
    visibleAuditLogs.forEach((log) => addValidDate(dates, log.createdAt));
  }

  if (!dates.length) {
    addValidDate(dates, generatedAt);
  }

  const timestamps = dates.map((date) => date.getTime());

  return {
    start: new Date(Math.min(...timestamps)).toISOString(),
    end: new Date(Math.max(...timestamps)).toISOString(),
  };
}

function getRequestStatusBucket(status) {
  const text = String(status || "").toLowerCase();

  if (
    text.includes("кайтар") ||
    text.includes("возвращ") ||
    text.includes("четке") ||
    text.includes("отклон") ||
    text.includes("returned") ||
    text.includes("rejected")
  ) {
    return "returned";
  }

  if (
    text.includes("кол кой") ||
    text.includes("одоб") ||
    text.includes("подпис") ||
    text.includes("аткар") ||
    text.includes("исполн") ||
    text.includes("completed") ||
    text.includes("approved")
  ) {
    return "approved";
  }

  return "pending";
}

function buildRequestTotals(visibleRequests) {
  return visibleRequests.reduce(
    (acc, request) => {
      const bucket = getRequestStatusBucket(normalizeRequestStatus(request.status));
      acc.total += 1;
      acc[bucket] += 1;
      return acc;
    },
    { total: 0, approved: 0, pending: 0, returned: 0 }
  );
}

function buildSummary(db, user) {
  const isGlobalScope = ["ADMIN", "DIRECTOR"].includes(user.roleCode);
  const canViewUserStats = ["ADMIN", "DIRECTOR", "HR"].includes(user.roleCode);
  const visibleRequests = db.requests.filter((request) => canViewRequest(user, request));
  const visibleDocuments = db.documents.filter((document) => canViewDocument(user, document));
  const visibleAuditLogs = filterAuditLogsForScope(db, user, visibleRequests, visibleDocuments, isGlobalScope);
  const usersForStats = canViewUserStats ? db.users : [];
  const generatedAt = new Date().toISOString();

  const requestsByStatus = visibleRequests.reduce((acc, item) => {
    const status = normalizeRequestStatus(item.status);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const usersByRole = usersForStats.reduce((acc, item) => {
    const role = getRoleTitle(item.roleCode);
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const usersByDepartment = usersForStats.reduce((acc, item) => {
    const department = getDepartmentTitle(item.departmentId);
    acc[department] = (acc[department] || 0) + 1;
    return acc;
  }, {});

  const documentsByCategory = visibleDocuments.reduce((acc, item) => {
    const category = getEffectiveDocumentCategory(item);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const documentsBySource = visibleDocuments.reduce(
    (acc, item) => {
      if (item.generatedOnLetterhead) {
        acc.letterhead += 1;
      } else if (item.isOfficial || item.sourceRequestId) {
        acc.official += 1;
      } else {
        acc.uploaded += 1;
      }

      return acc;
    },
    { uploaded: 0, letterhead: 0, official: 0 }
  );

  const assignmentsByStatus = visibleDocuments
    .flatMap((item) => (Array.isArray(item.assignments) ? item.assignments : []))
    .filter(
      (item) =>
        isGlobalScope ||
        item.recipientId === user.id ||
        item.senderId === user.id ||
        db.users.find((dbUser) => dbUser.id === item.recipientId)?.roleCode === user.roleCode
    )
    .reduce((acc, item) => {
      const status = item.status || "sent";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

  return {
    generatedAt,
    period: buildReportPeriod(visibleRequests, visibleDocuments, visibleAuditLogs, generatedAt),
    scope: isGlobalScope ? "global" : "role",
    scopeRole: user.roleCode,
    scopeTitle: isGlobalScope ? "Общий отчёт учреждения" : `Отчёт по доступу роли: ${getRoleTitle(user.roleCode)}`,
    canViewUserStats,
    requestTotals: buildRequestTotals(visibleRequests),
    requestsByStatus,
    usersByRole,
    usersByDepartment,
    documentsByCategory,
    documentsBySource,
    assignmentsByStatus,
    totalDocuments: visibleDocuments.length,
    totalAuditLogs: visibleAuditLogs.length,
  };
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\r\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(rows) {
  return rows.map((row) => row.map(escapeCsvValue).join(";")).join("\r\n");
}

function appendMetricRows(rows, section, metrics) {
  Object.entries(metrics || {}).forEach(([name, value]) => {
    rows.push([section, name, value]);
  });
}

function buildSummaryCsv(summary) {
  const rows = [["section", "metric", "value"]];
  rows.push(["scope", summary.scope, summary.scopeTitle]);
  rows.push(["meta", "generatedAt", summary.generatedAt]);
  rows.push(["meta", "periodStart", summary.period?.start || ""]);
  rows.push(["meta", "periodEnd", summary.period?.end || ""]);
  rows.push(["totals", "documents", summary.totalDocuments]);
  rows.push(["totals", "auditLogs", summary.totalAuditLogs]);
  appendMetricRows(rows, "requestTotals", summary.requestTotals);
  appendMetricRows(rows, "requestsByStatus", summary.requestsByStatus);
  appendMetricRows(rows, "usersByRole", summary.usersByRole);
  appendMetricRows(rows, "usersByDepartment", summary.usersByDepartment);
  appendMetricRows(rows, "documentsByCategory", summary.documentsByCategory);
  appendMetricRows(rows, "documentsBySource", summary.documentsBySource);
  appendMetricRows(rows, "assignmentsByStatus", summary.assignmentsByStatus);
  return `\uFEFF${toCsv(rows)}\r\n`;
}

router.get("/summary", authenticate, authorize("ADMIN", "DIRECTOR", "ACADEMIC_OFFICE", "HR", "ACCOUNTANT"), (req, res) => {
  res.json(buildSummary(readDb(), req.user));
});

router.get("/summary.csv", authenticate, authorize("ADMIN", "DIRECTOR", "ACADEMIC_OFFICE", "HR", "ACCOUNTANT"), (req, res) => {
  const csv = buildSummaryCsv(buildSummary(readDb(), req.user));
  const fileName = `reports-summary-${new Date().toISOString().slice(0, 10)}.csv`;

  appendAuditLog({
    userId: req.user.id,
    action: "CSV отчёт сформирован",
    entityType: "report",
    entityId: "summary",
    req,
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(csv);
});

router.get("/summary.pdf", authenticate, authorize("ADMIN", "DIRECTOR", "ACADEMIC_OFFICE", "HR", "ACCOUNTANT"), async (req, res) => {
  try {
    const pdf = await buildSummaryPdf({
      summary: buildSummary(readDb(), req.user),
      generatedBy: req.user,
    });
    const fileName = `reports-summary-${new Date().toISOString().slice(0, 10)}.pdf`;

    appendAuditLog({
      userId: req.user.id,
      action: "PDF отчёт сформирован",
      entityType: "report",
      entityId: "summary",
      req,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ message: error.message || "Не удалось сформировать PDF отчёт." });
  }
});

module.exports = router;
