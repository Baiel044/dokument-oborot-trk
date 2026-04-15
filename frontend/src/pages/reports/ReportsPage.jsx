import { useEffect, useState } from "react";
import { StatCard } from "../../components/ui/StatCard";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import {
  translateDepartment,
  translateRequestStatus,
  translateRole,
} from "../../utils/localization";

export function ReportsPage() {
  const { language, t } = useLanguage();
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get("/api/reports/summary").then(setReport).catch(() => null);
  }, []);

  if (!report) {
    return <div className="page-loader">{t("reports.loading")}</div>;
  }

  return (
    <div className="page-stack">
      <section className="stat-grid">
        <StatCard title={t("reports.documents")} value={report.totalDocuments} accent="blue" />
        <StatCard title={t("reports.auditLogs")} value={report.totalAuditLogs} accent="red" />
      </section>

      <section className="panel-grid">
        <article className="panel">
          <div className="panel__header">
            <h3>{t("reports.requestStatuses")}</h3>
          </div>
          {Object.entries(report.requestsByStatus).map(([status, value]) => (
            <div className="summary-row" key={status}>
              <span>{translateRequestStatus(status, language)}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </article>
        <article className="panel">
          <div className="panel__header">
            <h3>{t("reports.usersByRole")}</h3>
          </div>
          {Object.entries(report.usersByRole).map(([role, value]) => (
            <div className="summary-row" key={role}>
              <span>{translateRole(role, language)}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </article>
        <article className="panel">
          <div className="panel__header">
            <h3>{t("reports.departments")}</h3>
          </div>
          {Object.entries(report.usersByDepartment).map(([department, value]) => (
            <div className="summary-row" key={department}>
              <span>{translateDepartment(department, language)}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
