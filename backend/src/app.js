const fs = require("fs");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { ensureStorage } = require("./data/store");
const { CORS_ORIGIN, FRONTEND_DIST_DIR, UPLOAD_DIR } = require("./utils/config");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const messagesRoutes = require("./routes/messages");
const requestsRoutes = require("./routes/requests");
const documentsRoutes = require("./routes/documents");
const notificationsRoutes = require("./routes/notifications");
const dashboardRoutes = require("./routes/dashboard");
const metaRoutes = require("./routes/meta");
const reportsRoutes = require("./routes/reports");
const auditRoutes = require("./routes/audit");

ensureStorage();

const app = express();
const frontendIndexPath = path.join(FRONTEND_DIST_DIR, "index.html");
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

function buildCorsOptions() {
  if (!CORS_ORIGIN || CORS_ORIGIN === "*") {
    return {};
  }

  const allowedOrigins = CORS_ORIGIN.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin is not allowed"));
    },
  };
}

app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));
app.use("/api/meta", metaRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/audit-logs", auditRoutes);

if (hasFrontendBuild) {
  app.use(express.static(FRONTEND_DIST_DIR));
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ message: "API route not found" });
    return;
  }

  if (hasFrontendBuild) {
    res.sendFile(frontendIndexPath);
    return;
  }

  res.json({
    name: "Document Workflow API",
    version: "1.0.0",
    uploads: path.relative(process.cwd(), UPLOAD_DIR),
    frontendBuild: false,
  });
});

module.exports = app;
