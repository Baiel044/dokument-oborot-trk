import { useEffect, useState } from "react";
import { StatCard } from "../../components/ui/StatCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { translateRequestStatus } from "../../utils/localization";

export function DashboardPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/api/dashboard").then(setData).catch(() => null);
  }, []);

  if (!data) {
    return <div className="page-loader">{t("dashboard.loading")}</div>;
  }

  const { summary, recentRequests, recentMessages, recentNotifications } = data;

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="section-kicker">{t("dashboard.kicker")}</span>
          <h2>{t("dashboard.title")}</h2>
        </div>
        <p>{t("dashboard.description")}</p>
      </section>

      <section className="stat-grid">
        <StatCard title={t("dashboard.myRequests")} value={summary.myRequests} accent="orange" />
        <StatCard title={t("dashboard.inboxMessages")} value={summary.inboxMessages} accent="blue" />
        <StatCard
          title={t("dashboard.unreadNotifications")}
          value={summary.unreadNotifications}
          accent="green"
        />
        <StatCard title={t("dashboard.documents")} value={summary.documents} accent="red" />
      </section>

      <section className="panel-grid">
        <article className="panel">
          <div className="panel__header">
            <h3>{t("dashboard.recentRequests")}</h3>
          </div>
          {recentRequests.length ? (
            recentRequests.map((item) => (
              <div className="feed-item" key={item.id}>
                <strong>{item.type}</strong>
                <p>{translateRequestStatus(item.status, language)}</p>
              </div>
            ))
          ) : (
            <EmptyState title={t("dashboard.noRequests")} text={t("dashboard.noRequestsText")} />
          )}
        </article>

        <article className="panel">
          <div className="panel__header">
            <h3>{t("dashboard.recentMessages")}</h3>
          </div>
          {recentMessages.length ? (
            recentMessages.map((item) => (
              <div className="feed-item" key={item.id}>
                <strong>{item.subject}</strong>
                <p>{item.text}</p>
              </div>
            ))
          ) : (
            <EmptyState title={t("dashboard.noMessages")} text={t("dashboard.noMessagesText")} />
          )}
        </article>

        <article className="panel">
          <div className="panel__header">
            <h3>{t("dashboard.recentNotifications")}</h3>
          </div>
          {recentNotifications.length ? (
            recentNotifications.map((item) => (
              <div className="feed-item" key={item.id}>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            ))
          ) : (
            <EmptyState title={t("dashboard.quiet")} text={t("dashboard.quietText")} />
          )}
        </article>
      </section>
    </div>
  );
}
