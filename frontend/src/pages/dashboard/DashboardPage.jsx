import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Bell, CalendarDays, FileText, MessageSquare, Plus } from "lucide-react";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { getLocale, translateRequestStatus } from "../../utils/localization";

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

function formatDate(value, language) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDashboardDate(value, language) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (language === "ru") {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    }).format(date);
  }

  const months = [
    "январь",
    "февраль",
    "март",
    "апрель",
    "май",
    "июнь",
    "июль",
    "август",
    "сентябрь",
    "октябрь",
    "ноябрь",
    "декабрь",
  ];
  const weekdays = ["жекшемби", "дүйшөмбү", "шейшемби", "шаршемби", "бейшемби", "жума", "ишемби"];

  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}-ж., ${weekdays[date.getDay()]}`;
}

function getRequestStatusBadgeClass(status, language) {
  const rawStatus = String(status || "").toLowerCase();
  const translatedStatus = String(translateRequestStatus(status, language) || "").toLowerCase();
  const statusText = `${rawStatus} ${translatedStatus}`;

  if (
    statusText.includes("approved") ||
    statusText.includes("одоб") ||
    statusText.includes("бекит") ||
    statusText.includes("кол кой")
  ) {
    return "dashboard-status-badge--approved";
  }

  if (statusText.includes("returned") || statusText.includes("возвращ") || statusText.includes("кайтар")) {
    return "dashboard-status-badge--returned";
  }

  if (statusText.includes("rejected") || statusText.includes("отклон") || statusText.includes("четке")) {
    return "dashboard-status-badge--rejected";
  }

  if (statusText.includes("completed") || statusText.includes("исполн") || statusText.includes("аткар")) {
    return "dashboard-status-badge--completed";
  }

  if (statusText.includes("draft") || statusText.includes("чернов") || statusText.includes("долбоор")) {
    return "dashboard-status-badge--draft";
  }

  return "dashboard-status-badge--pending";
}

function getStatusBadgeClass(status, language) {
  const tone = getRequestStatusBadgeClass(status, language).replace("dashboard-status-badge--", "");
  const map = {
    approved: "badge-success",
    completed: "badge-success",
    returned: "badge-warning",
    rejected: "badge-danger",
    draft: "badge-neutral",
    pending: "badge-info",
  };
  return `badge ${map[tone] || "badge-info"}`;
}

const copyByLanguage = {
  ru: {
    greeting: "Добро пожаловать",
    welcome: "Обзор заявлений, сообщений и документов на сегодня.",
    allRequests: "Все заявления",
    allMessages: "Все сообщения",
    allNotifications: "Все уведомления",
    recentRequests: "Последние заявления",
    recentRequestsHint: "Пять последних обращений, доступных вам",
    recentMessages: "Последние сообщения",
    recentNotifications: "Непрочитанные уведомления",
    tableNo: "№",
    tableTheme: "Тема",
    tableStatus: "Статус",
    tableDate: "Дата",
    tableAction: "Открыть",
    myRequests: "Мои заявления",
    messages: "Сообщения",
    documents: "Документы",
    notifications: "Уведомления",
    pending: "на рассмотрении",
    approved: "подписано",
    unread: "непрочитанных",
    available: "доступно вам",
    newRequest: "Новое заявление",
    noRequests: "Пока нет заявлений",
    noRequestsText: "Созданные заявления появятся здесь.",
    noMessages: "Сообщений пока нет",
    noMessagesText: "Новые переписки появятся здесь.",
    noNotifications: "Всё прочитано",
    noNotificationsText: "Новые уведомления появятся здесь.",
    unreadSubject: "Без темы",
    fallbackUser: "Пользователь",
    loading: "Кабинет загружается...",
  },
  ky: {
    greeting: "Кош келиңиз",
    welcome: "Бүгүнкү арыздар, кабарлар жана документтер боюнча кыскача маалымат.",
    allRequests: "Бардык арыздар",
    allMessages: "Бардык кабарлар",
    allNotifications: "Бардык билдирмелер",
    recentRequests: "Акыркы арыздар",
    recentRequestsHint: "Сизге жеткиликтүү акыркы беш кайрылуу",
    recentMessages: "Акыркы кабарлар",
    recentNotifications: "Окулбаган билдирмелер",
    tableNo: "№",
    tableTheme: "Тема",
    tableStatus: "Статус",
    tableDate: "Дата",
    tableAction: "Ачуу",
    myRequests: "Менин арыздарым",
    messages: "Кабарлар",
    documents: "Документтер",
    notifications: "Билдирмелер",
    pending: "каралууда",
    approved: "кол коюлду",
    unread: "окулбаган",
    available: "сизге жеткиликтүү",
    newRequest: "Жаңы арыз",
    noRequests: "Арыздар жок",
    noRequestsText: "Жаңы кайрылуулар ушул жерде чыгат.",
    noMessages: "Кабарлар жок",
    noMessagesText: "Жаңы каттар ушул жерде чыгат.",
    noNotifications: "Баары окулду",
    noNotificationsText: "Жаңы билдирмелер ушул жерде чыгат.",
    unreadSubject: "Темасыз",
    fallbackUser: "Колдонуучу",
    loading: "Кабинет жүктөлүүдө...",
  },
};

export function DashboardPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    api.get("/api/dashboard").then(setData).catch(() => null);
  }, []);

  useEffect(() => {
    const updateCurrentDate = () => setToday(new Date());
    const intervalId = window.setInterval(updateCurrentDate, 60 * 1000);

    updateCurrentDate();
    return () => window.clearInterval(intervalId);
  }, []);

  const copy = useMemo(() => copyByLanguage[language] || copyByLanguage.ky, [language]);

  if (!data) {
    return <div className="page-loader">{copy.loading}</div>;
  }

  const { summary, recentRequests, recentMessages, recentNotifications = [] } = data;
  const displayName = readableText(user.fullName, "") || user.username || copy.fallbackUser;

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <h1 className="page-title">
            {copy.greeting}, {displayName}
          </h1>
          <p className="page-subtitle">{copy.welcome}</p>
        </div>
        <div className="page-header-actions">
          <span className="date-pill">
            <CalendarDays size={16} aria-hidden="true" />
            {formatDashboardDate(today, language)}
          </span>
          <Link className="btn btn-primary" to="/requests">
            <Plus size={18} aria-hidden="true" />
            {copy.newRequest}
          </Link>
        </div>
      </section>

      <section className="kpi-grid kpi-grid--4 stagger-in">
        <StatCard
          title={copy.myRequests}
          value={summary.myRequests}
          subtitle={`${summary.pendingRequests ?? 0} ${copy.pending} · ${summary.approvedRequests ?? 0} ${copy.approved}`}
          accent="orange"
          icon="requests"
          onClick={() => navigate("/requests")}
          ariaLabel={copy.allRequests}
        />
        <StatCard
          title={copy.messages}
          value={summary.inboxMessages}
          subtitle={`${summary.unreadMessages ?? 0} ${copy.unread}`}
          accent="blue"
          icon="messages"
          onClick={() => navigate("/messages")}
          ariaLabel={copy.allMessages}
        />
        <StatCard
          title={copy.documents}
          value={summary.documents}
          subtitle={copy.available}
          accent="green"
          icon="documents"
          onClick={() => navigate("/documents")}
          ariaLabel={copy.documents}
        />
        <StatCard
          title={copy.notifications}
          value={summary.unreadNotifications}
          subtitle={copy.unread}
          accent="red"
          icon="notifications"
          onClick={() => navigate("/notifications")}
          ariaLabel={copy.notifications}
        />
      </section>

      <section className="dashboard-bottom-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">{copy.recentRequests}</h3>
              <p className="card-subtitle">{copy.recentRequestsHint}</p>
            </div>
            <Link className="btn btn-ghost btn-sm" to="/requests">
              {copy.allRequests}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {recentRequests.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{copy.tableNo}</th>
                    <th>{copy.tableTheme}</th>
                    <th>{copy.tableStatus}</th>
                    <th>{copy.tableDate}</th>
                    <th aria-label={copy.tableAction} />
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.slice(0, 5).map((item, index) => (
                    <tr
                      className="table-row-clickable"
                      key={item.id}
                      onClick={() => navigate(`/requests?request=${encodeURIComponent(item.id)}`)}
                    >
                      <td className="text-muted mono-num">{index + 1}</td>
                      <td className="table-cell-strong">
                        {readableText(item.documentTitle || item.type, copy.unreadSubject)}
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(item.status, language)}>
                          {translateRequestStatus(item.status, language)}
                        </span>
                      </td>
                      <td className="text-secondary mono-num">{formatDate(item.createdAt || item.updatedAt, language)}</td>
                      <td className="table-actions">
                        <Link
                          className="btn btn-ghost btn-icon btn-sm"
                          to={`/requests?request=${encodeURIComponent(item.id)}`}
                          aria-label={copy.tableAction}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ArrowUpRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={copy.noRequests} text={copy.noRequestsText} icon={FileText} />
          )}
        </article>

        <div className="stack gap-4 dashboard-side">
          <article className="card">
            <div className="card-header">
              <h3 className="card-title">{copy.recentMessages}</h3>
              <Link className="btn btn-ghost btn-sm" to="/messages">
                {copy.allMessages}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            {recentMessages.length ? (
              <ul className="list">
                {recentMessages.slice(0, 4).map((item) => {
                  const sender = readableText(item.senderName, "");
                  const title = sender || readableText(item.subject, copy.unreadSubject);
                  const meta = sender ? readableText(item.subject || item.text, "") : readableText(item.text, "");
                  return (
                    <li key={item.id}>
                      <Link className="list-item" to="/messages">
                        <span className="avatar avatar-md">{title.charAt(0)}</span>
                        <span className="list-item-text">
                          <span className="list-item-title">
                            {title}
                            {!item.isRead ? <span className="dot dot-primary" aria-hidden="true" /> : null}
                          </span>
                          {meta ? <span className="list-item-meta">{meta}</span> : null}
                        </span>
                        <time className="list-item-time">{formatDate(item.createdAt, language)}</time>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title={copy.noMessages} text={copy.noMessagesText} icon={MessageSquare} />
            )}
          </article>

          <article className="card">
            <div className="card-header">
              <h3 className="card-title">{copy.recentNotifications}</h3>
              <Link className="btn btn-ghost btn-sm" to="/notifications">
                {copy.allNotifications}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            {recentNotifications.length ? (
              <ul className="list">
                {recentNotifications.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <Link className="list-item" to={item.targetPath || "/notifications"}>
                      <span className="list-item-icon" aria-hidden="true">
                        <Bell size={16} />
                      </span>
                      <span className="list-item-text">
                        <span className="list-item-title">{readableText(item.title, copy.notifications)}</span>
                        {item.text ? <span className="list-item-meta">{item.text}</span> : null}
                      </span>
                      <time className="list-item-time">{formatDate(item.createdAt, language)}</time>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={copy.noNotifications} text={copy.noNotificationsText} icon={Bell} />
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
