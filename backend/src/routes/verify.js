const express = require("express");
const { readDb } = require("../data/store");
const { findSignedDocument } = require("../utils/verification");

const router = express.Router();

// Public: the QR code on a printed PDF opens this check without signing in.
router.get("/:code", (req, res) => {
  const document = findSignedDocument(readDb(), req.params.code);
  if (!document) {
    return res.status(404).json({ valid: false, message: "Мындай код менен кол коюлган документ табылган жок." });
  }
  return res.json({ valid: true, document });
});

module.exports = router;
