import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";

const ALLOWED_NOTIFICATION_PATHS = new Set([
  "/",
  "/messages",
  "/requests",
  "/documents",
  "/notifications",
  "/profile",
  "/users",
  "/reports",
  "/admin",
]);

const fallbackNotificationsByLanguage = {
  ru: [
    "Новое заявление отправлено директору",
    "Ваш документ одобрен",
    "Документ возвращён на доработку",
    "Пришло новое сообщение",
  ],
  ky: [
    "Жаңы арыз директорго жөнөтүлдү",
    "Документиңиз бекитилди",
    "Документ кайра иштеп чыгууга кайтарылды",
    "Жаңы кабар келди",
  ],
};

function getSafeNotificationTarget(targetPath) {
  const rawTarget = String(targetPath || "");
  if (!rawTarget.startsWith("/") || rawTarget.startsWith("//")) {
    return "";
  }

  try {
    const url = new URL(rawTarget, window.location.origin);
    if (url.origin !== window.location.origin || !ALLOWED_NOTIFICATION_PATHS.has(url.pathname)) {
      return "";
    }

    return `${url.pathname}${url.search}`;
  } catch (_error) {
    return "";
  }
}

function formatDate(value, language) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "ky-KG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getTone(index, isRead) {
  if (isRead) {
    return "muted";
  }

  return ["blue", "green", "red", "blue"][index % 4];
}

function isUnreadableText(value) {
  const text = String(value || "").trim();
  const questionMarks = text.match(/\?/g) || [];
  const mojibakePairs = text.match(/[РС][\u0400-\u04ff]/g) || [];
  const readablePart = text.replace(/[?\s.,:;!"'()\-вЂ“вЂ”>В«В»/\\]+/g, "");
  return (questionMarks.length >= 3 && !readablePart) || mojibakePairs.length >= 3;
}

function readableText(value, fallback) {
  const text = String(value || "").trim();
  return text && !isUnreadableText(text) ? text : fallback;
}

function NotificationIcon({ tone }) {
  const isMessage = tone === "blue" || tone === "muted";
  const isSuccess = tone === "green";
  const isReturn = tone === "red";

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {isMessage ? (
        <>
          <path d="M6 5.5h12v9H9l-3 3v-12Z" />
          <path d="M9 9.5h6" />
          <path d="M9 12.5h4" />
        </>
      ) : null}
      {isSuccess ? (
        <>
          <path d="M7 4.5h8l3 3v12H7v-15Z" />
          <path d="M15 4.5v4h4" />
          <path d="m9.5 13 2 2 4-4" />
        </>
      ) : null}
      {isReturn ? (
        <>
          <path d="M7 5h10v14H7V5Z" />
          <path d="M9.5 10.5h5" />
          <path d="m10.5 15.5 3-3 3 3" />
        </>
      ) : null}
    </svg>
  );
}

export function NotificationsPage() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  const labels =
    language === "ru"
      ? {
          title: "Уведомления",
          markAll: "Отметить все как прочитанные",
          open: "Открыть",
          read: "Прочитано",
        }
      : {
          title: "Билдирүүлөр",
          markAll: "Баарын окулду деп белгилөө",
          open: "Ачуу",
          read: "Окулду",
        };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleRealtimeRefresh() {
      loadNotifications();
    }

    window.addEventListener("app:badges-refresh", handleRealtimeRefresh);
    return () => window.removeEventListener("app:badges-refresh", handleRealtimeRefresh);
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

  async function openNotification(notification) {
    const targetPath = getSafeNotificationTarget(notification.targetPath);
    if (!targetPath) {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
      return;
    }

    if (!notification.isRead) {
      await api.put(`/api/notifications/${notification.id}/read`, {});
      window.dispatchEvent(new Event("app:badges-refresh"));
    }

    navigate(targetPath);
  }

  async function markAllAsRead() {
    await api.put("/api/notifications/read-all", {});
    loadNotifications();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="notifications-model">
      <section className="notifications-model__panel">
        <div className="notifications-model__header">
          <h1>{labels.title}</h1>
          {unreadCount ? (
            <button className="ghost-button" type="button" onClick={markAllAsRead}>
              {labels.markAll}
            </button>
          ) : null}
        </div>

        {notifications.length ? (
          <div className="notifications-model__list">
            {notifications.map((item, index) => {
              const targetPath = getSafeNotificationTarget(item.targetPath);
              const tone = getTone(index, item.isRead);
              const fallbackNotifications =
                fallbackNotificationsByLanguage[language] || fallbackNotificationsByLanguage.ky;
              const title = readableText(
                item.title || item.text,
                fallbackNotifications[index % fallbackNotifications.length]
              );
              const text = item.text && item.text !== item.title ? readableText(item.text, "") : "";

              return (
                <article
                  className={item.isRead ? "notification-card notification-card--read" : "notification-card"}
                  key={item.id}
                >
                  <button
                    className={`notification-card__icon notification-card__icon--${tone}`}
                    type="button"
                    onClick={() => (targetPath ? openNotification(item) : markAsRead(item.id))}
                    aria-label={targetPath ? labels.open : labels.read}
                  >
                    <NotificationIcon tone={tone} />
                  </button>
                  <button className="notification-card__body" type="button" onClick={() => openNotification(item)}>
                    <strong>{title}</strong>
                    {text ? <small>{text}</small> : null}
                  </button>
                  <time>{formatDate(item.createdAt, language)}</time>
                  {!item.isRead ? <span className="notification-card__dot" /> : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title={t("notifications.noNotifications")} text={t("notifications.noNotificationsText")} />
        )}
      </section>
    </div>
  );
}
