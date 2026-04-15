import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";

export function NotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const data = await api.get("/api/notifications");
    setNotifications(data.notifications);
  }

  async function markAsRead(id) {
    await api.put(`/api/notifications/${id}/read`, {});
    loadNotifications();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel__header">
          <h3>{t("notifications.title")}</h3>
        </div>
        {notifications.length ? (
          notifications.map((item) => (
            <div className="notification-row" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
              {!item.isRead ? (
                <button className="ghost-button" onClick={() => markAsRead(item.id)}>
                  {t("common.read")}
                </button>
              ) : (
                <span className="tag tag--green">{t("common.read")}</span>
              )}
            </div>
          ))
        ) : (
          <EmptyState title={t("notifications.noNotifications")} text={t("notifications.noNotificationsText")} />
        )}
      </section>
    </div>
  );
}
