const fs = require("fs");

/**
 * Deletes the file multer stored for this request when the request ends with an error,
 * so rejected or invalid uploads never stay on disk. Register it before the multer middleware.
 */
function removeUploadOnFailure(req, res, next) {
  res.on("finish", () => {
    if (res.statusCode < 400) {
      return;
    }

    const files = [req.file, ...(Array.isArray(req.files) ? req.files : [])].filter(Boolean);
    files.forEach((file) => {
      if (file.path) {
        fs.rm(file.path, { force: true }, () => {});
      }
    });
  });
  next();
}

module.exports = { removeUploadOnFailure };
