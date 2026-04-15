import { useEffect, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { getLocale, translateAuditAction, translateRole } from "../../utils/localization";

export function AdminPage() {
  const { language, t } = useLanguage();
  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);

  useEffect(() => {
    Promise.all([api.get("/api/audit-logs"), api.get("/api/users?status=pending")])
      .then(([logs, users]) => {
        setAuditLogs(logs.auditLogs);
        setPendingUsers(users.users);
      })
      .catch(() => null);
  }, []);

  return (
    <div className="page-stack">
      <section className="panel-grid">
        <article className="panel">
          <div className="panel__header">
            <h3>{t("admin.pendingUsers")}</h3>
          </div>
          {pendingUsers.length ? (
            pendingUsers.map((item) => (
              <div className="summary-row" key={item.id}>
                <span>{item.fullName}</span>
                <strong>{translateRole(item.roleCode || item.roleTitle, language)}</strong>
              </div>
            ))
          ) : (
            <p className="muted-text">{t("admin.noPendingUsers")}</p>
          )}
        </article>

        <article className="panel panel--wide">
          <div className="panel__header">
            <h3>{t("admin.auditLog")}</h3>
          </div>
          {auditLogs.map((item) => (
            <div className="summary-row" key={item.id}>
              <span>{translateAuditAction(item.action, language)}</span>
              <strong>{new Date(item.createdAt).toLocaleString(getLocale(language))}</strong>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
