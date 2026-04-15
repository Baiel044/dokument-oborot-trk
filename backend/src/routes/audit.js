const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const { readDb } = require("../data/store");

const router = express.Router();

router.get("/", authenticate, authorize("ADMIN", "DIRECTOR"), (_req, res) => {
  const db = readDb();
  res.json({ auditLogs: db.auditLogs.slice(0, 100) });
});

module.exports = router;
