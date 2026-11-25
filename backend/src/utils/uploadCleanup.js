const fs = require("fs");
const path = require("path");
const { UPLOAD_DIR } = require("./config");

/** Deletes files from disk unless another document or request still points to them. */
function removeUnreferencedFiles(db, fileNames) {
  const stillReferenced = JSON.stringify([db.documents, db.requests]);
  [...new Set(fileNames)].forEach((fileName) => {
    if (!fileName || stillReferenced.includes(fileName)) {
      return;
    }
    fs.rm(path.join(UPLOAD_DIR, fileName), { force: true }, () => {});
  });
}

module.exports = { removeUnreferencedFiles };
