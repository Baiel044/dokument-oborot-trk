const express = require("express");
const cors = require("cors");
const path = require("path");
const { ensureStorage } = require("./data/store");
const { UPLOAD_DIR } = require("./utils/config");

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

app.use(cors());
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

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("*", (_req, res) => {
  res.json({
    name: "Document Workflow API",
    version: "1.0.0",
    uploads: path.relative(process.cwd(), UPLOAD_DIR),
  });
});

module.exports = app;
