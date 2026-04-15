const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { readDb } = require("../data/store");
const { getDepartmentTitle, getRoleTitle, normalizeRequestStatus } = require("../utils/catalogs");

const router = express.Router();

router.get("/summary", authenticate, authorize("ADMIN", "DIRECTOR", "HR", "ACCOUNTANT"), (_req, res) => {
  const db = readDb();

  const requestsByStatus = db.requests.reduce((acc, item) => {
    const status = normalizeRequestStatus(item.status);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const usersByRole = db.users.reduce((acc, item) => {
    const role = getRoleTitle(item.roleCode);
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const usersByDepartment = db.users.reduce((acc, item) => {
    const department = getDepartmentTitle(item.departmentId);
    acc[department] = (acc[department] || 0) + 1;
    return acc;
  }, {});

  res.json({
    requestsByStatus,
    usersByRole,
    usersByDepartment,
    totalDocuments: db.documents.length,
    totalAuditLogs: db.auditLogs.length,
  });
});

module.exports = router;
