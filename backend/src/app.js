const fs = require("fs");
const express = require("express");
const cors = require("cors");
const path = require("path");
const { ensureStorage } = require("./data/store");
const { CORS_ORIGIN, FRONTEND_DIST_DIR, TRUST_PROXY, UPLOAD_DIR } = require("./utils/config");

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
const filesRoutes = require("./routes/files");

ensureStorage();

const app = express();
if (TRUST_PROXY) {
  app.set("trust proxy", /^\d+$/.test(TRUST_PROXY) ? Number(TRUST_PROXY) : TRUST_PROXY);
}
const frontendIndexPath = path.join(FRONTEND_DIST_DIR, "index.html");
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

function isLocalNetworkOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return true;
    }

    return (
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch (_error) {
    return false;
  }
}

function buildCorsOptions() {
  if (!CORS_ORIGIN || CORS_ORIGIN === "*") {
    return { origin: true };
  }

  const allowedOrigins = CORS_ORIGIN.split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  // "https://*.vercel.app" style entries allow any subdomain (e.g. Vercel preview deployments).
  const isAllowedOrigin = (origin) =>
    allowedOrigins.some((allowed) => {
      if (!allowed.includes("*")) {
        return allowed === origin;
      }
      const escaped = allowed.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"));
      return new RegExp(`^${escaped.join("[a-z0-9-]+")}$`, "i").test(origin);
    });

  return {
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin) || isLocalNetworkOrigin(origin)) {
        callback(null, true);
        return;
      }

      // No CORS headers: the browser blocks the response for unknown sites.
      callback(null, false);
    },
  };
}

app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use("/uploads", (_req, res) => {
  res.status(404).json({ message: "Files are available only through protected API routes." });
});
app.use("/api/meta", metaRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/applications", requestsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/activity-log", auditRoutes);

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
