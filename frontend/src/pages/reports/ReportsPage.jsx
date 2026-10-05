import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import {
  getLocale,
  translateDocumentCategory,
  translateRequestStatus,
  translateRole,
} from "../../utils/localization";

const chartColors = ["#7557f6", "#21b66f", "#ff8b2f", "#94a3b8", "#ef4444", "#2f80ed"];

function sumEntries(entries) {
  return entries.reduce((total, [, value]) => total + Number(value || 0), 0);
}

function buildDonutGradient(entries) {
  const total = sumEntries(entries);

  if (!total) {
    return "conic-gradient(#e5eaf7 0 100%)";
  }

  let cursor = 0;
  const segments = entries.map(([, value], index) => {
    const start = cursor;
    const size = (Number(value || 0) / total) * 100;
    cursor += size;
    return `${chartColors[index % chartColors.length]} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function ReportMetric({ title, value, accent }) {
  const icons = {
    blue: (
      <>
        <path d="M7 3h7l4 4v14H7V3Z" />
        <path d="M14 3v5h4" />
        <path d="M10 12h5" />
        <path d="M10 16h4" />
      </>
    ),
    green: (
      <>
        <path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z" />
        <path d="m8.5 12.5 2.2 2.2 4.8-5.4" />
      </>
    ),
    orange: (
      <>
        <path d="M12 7v5l3 2" />
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 4v5h-5" />
      </>
    ),
    red: (
      <>
        <path d="M4 7h16" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M6 7l1 14h10l1-14" />
        <path d="M9 7V4h6v3" />
      </>
    ),
  };

  return (
    <article className={`report-metric report-metric--${accent}`}>
      <span className="report-metric__icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {icons[accent] || icons.blue}
        </svg>
      </span>
      <span>
        <strong>{value}</strong>
        <small>{title}</small>
      </span>
    </article>
  );
}

function DonutPanel({ title, entries }) {
  const gradient = buildDonutGradient(entries);

  return (
    <article className="panel report-chart-card">
      <div className="panel__header">
        <h3>{title}</h3>
      </div>
      <div className="report-donut-layout">
        <div className="report-donut" style={{ "--donut-gradient": gradient }} />
        <div className="report-legend">
          {entries.map(([label, value], index) => (
            <div className="report-legend__item" key={label}>
              <span style={{ "--legend-color": chartColors[index % chartColors.length] }} />
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function BarPanel({ title, entries }) {
  const maxValue = Math.max(...entries.map(([, value]) => Number(value || 0)), 1);

  return (
    <article className="panel report-chart-card report-chart-card--wide">
      <div className="panel__header">
        <h3>{title}</h3>
      </div>
      <div className="report-bars">
        {entries.map(([label, value], index) => (
          <div className="report-bar" key={label}>
            <span>{label}</span>
            <div>
              <i
                style={{
                  "--bar-color": chartColors[index % chartColors.length],
                  width: `${Math.max(8, (Number(value || 0) / maxValue) * 100)}%`,
                }}
              />
            </div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function formatReportDate(value, language) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatReportDateTime(value, language) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildDateRangeLabel(report, language, labels) {
  const start = formatReportDate(report.period?.start, language);
  const end = formatReportDate(report.period?.end, language);
  const generatedAt = formatReportDateTime(report.generatedAt || new Date(), language);
  const period = start && end ? `${start} - ${end}` : labels.today;

  return `${period} · ${labels.generatedAt}: ${generatedAt}`;
}

export function ReportsPage() {
  const { language, t } = useLanguage();
  const [report, setReport] = useState(null);

  const labels = useMemo(
    () =>
      language === "ru"
        ? {
            title: "Отчёты",
            documents: "Всего документов",
            approved: "Одобрено",
            pending: "В ожидании",
            returned: "Возвращено",
            structure: "Структура заявлений",
            roles: "Пользователи по ролям",
            categories: "Документы по категориям",
            generatedAt: "сформировано",
            today: "Сегодня",
            exportCsv: "CSV",
            exportPdf: "PDF",
            exportError: "Не удалось скачать отчёт.",
            noData: "Нет данных для отображения",
          }
        : {
            title: "Отчёттор",
            documents: "Бардык документ",
            approved: "Бекитилди",
            pending: "Күтүүдө",
            returned: "Кайтарылды",
            structure: "Арыздардын түзүмү",
            roles: "Ролдор боюнча колдонуучулар",
            categories: "Документтер категориясы",
            generatedAt: "түзүлдү",
            today: "Бүгүн",
            exportCsv: "CSV",
            exportPdf: "PDF",
            exportError: "Отчётту жүктөө мүмкүн болгон жок.",
            noData: "Көрсөтүү үчүн маалымат жок",
          },
    [language]
  );

  useEffect(() => {
    api.get("/api/reports/summary").then(setReport).catch(() => null);
  }, []);

  async function downloadReport(path, extension) {
    try {
      const blob = await api.download(path);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reports-summary-${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (_error) {
      window.alert(labels.exportError);
    }
  }

  if (!report) {
    return <div className="page-loader">{t("reports.loading")}</div>;
  }

  const statusEntries = Object.entries(report.requestsByStatus || {}).map(([status, value]) => [
    translateRequestStatus(status, language),
    value,
  ]);
  const roleEntries = Object.entries(report.usersByRole || {}).map(([role, value]) => [
    translateRole(role, language),
    value,
  ]);
  const categoryEntries = Object.entries(report.documentsByCategory || {}).map(([category, value]) => [
    translateDocumentCategory(category, language),
    value,
  ]);
  const requestTotals = report.requestTotals || {};
  const pendingTotal = Number(requestTotals.pending ?? sumEntries(statusEntries));
  const approvedTotal = Number(
    requestTotals.approved ??
      Number(report.documentsBySource?.official || 0) + Number(report.documentsBySource?.letterhead || 0)
  );
  const returnedTotal = Number(
    requestTotals.returned ??
      Number(report.assignmentsByStatus?.returned || 0) + Number(report.assignmentsByStatus?.rejected || 0)
  );
  const dateRangeLabel = buildDateRangeLabel(report, language, labels);

  return (
    <div className="reports-model">
      <section className="reports-model__header">
        <h1>{labels.title}</h1>
        <div className="reports-model__actions">
          <span className="reports-model__date">{dateRangeLabel}</span>
          <button className="ghost-button" type="button" onClick={() => downloadReport("/api/reports/summary.csv", "csv")}>
            {labels.exportCsv}
          </button>
          <button className="ghost-button" type="button" onClick={() => downloadReport("/api/reports/summary.pdf", "pdf")}>
            {labels.exportPdf}
          </button>
        </div>
      </section>

      <section className="reports-model__metrics">
        <ReportMetric title={labels.documents} value={report.totalDocuments} accent="blue" />
        <ReportMetric title={labels.approved} value={approvedTotal} accent="green" />
        <ReportMetric title={labels.pending} value={pendingTotal} accent="orange" />
        <ReportMetric title={labels.returned} value={returnedTotal} accent="red" />
      </section>

      <section className="reports-model__charts">
        {statusEntries.length ? (
          <DonutPanel title={labels.structure} entries={statusEntries} />
        ) : (
          <article className="panel report-chart-card">
            <p className="muted-text">{labels.noData}</p>
          </article>
        )}
        {roleEntries.length ? (
          <BarPanel title={labels.roles} entries={roleEntries} />
        ) : (
          <article className="panel report-chart-card report-chart-card--wide">
            <p className="muted-text">{labels.noData}</p>
          </article>
        )}
        {categoryEntries.length ? (
          <DonutPanel title={labels.categories} entries={categoryEntries} />
        ) : (
          <article className="panel report-chart-card">
            <p className="muted-text">{labels.noData}</p>
          </article>
        )}
      </section>
    </div>
  );
}
