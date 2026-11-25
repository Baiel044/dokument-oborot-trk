const express = require("express");
const {
  ROLES,
  DEPARTMENTS,
  REQUEST_TYPES,
  REQUEST_TYPE_GROUPS,
  REQUEST_STATUSES,
  DOCUMENT_CATEGORIES,
} = require("../utils/catalogs");

const router = express.Router();

router.get("/catalogs", (_req, res) => {
  res.json({
    roles: ROLES,
    departments: DEPARTMENTS,
    requestTypes: REQUEST_TYPES,
    requestTypeGroups: REQUEST_TYPE_GROUPS,
    requestStatuses: REQUEST_STATUSES,
    documentCategories: DOCUMENT_CATEGORIES,
  });
});

module.exports = router;
