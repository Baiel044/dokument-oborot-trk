import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const copyByLanguage = {
  ru: {
    greeting: "Добро пожаловать",
    welcome: "Добро пожаловать в систему EduFlow TRK",
    allRequests: "Все заявления",
    allMessages: "Все сообщения",
    recentRequests: "Последние заявления",
    recentMessages: "Последние сообщения",
    tableNo: "№",
    tableTheme: "Тема",
    tableStatus: "Статус",
    tableDate: "Дата",
    tableAction: "Действие",
    myRequests: "Мои заявления",
    messages: "Сообщения",
    documents: "Документы",
    notifications: "Уведомления",
    inProgress: "В ожидании",
    newItems: "Новые",
    official: "Оформленные: 5",
    noRequests: "Пока нет заявлений",
    noRequestsText: "Созданные заявления появятся здесь.",
    noMessages: "Сообщений пока нет",
    noMessagesText: "Новые переписки появятся здесь.",
    unreadSubject: "Тема недоступна",
    unreadText: "Текст сообщения недоступен",
    promoTitle: "Упрощаем работу и усиливаем результат",
  },
  ky: {
    greeting: "Кош келиниз",
    welcome: "EduFlow TRK системасына кош келиңиз",
    allRequests: "Бардык арыздар",
    allMessages: "Бардык билдирүүлөр",
    recentRequests: "Акыркы арыздар",
    recentMessages: "Акыркы билдирүүлөр",
    tableNo: "№",
    tableTheme: "Тема",
    tableStatus: "Статус",
    tableDate: "Дата",
    tableAction: "Аракет",
    myRequests: "Менин арыздарым",
    messages: "Билдирүүлөр",
    documents: "Документтер",
    notifications: "Эскертмелер",
    inProgress: "Күтүүдө",
    newItems: "Жаңы",
    official: "Расмий: 5",
    noRequests: "Арыздар жок",
    noRequestsText: "Жаңы кайрылуулар ушул жерде чыгат.",
    noMessages: "Билдирүүлөр жок",
    noMessagesText: "Жаңы каттар ушул жерде чыгат.",
    unreadSubject: "Тема жеткиликсиз",
    unreadText: "Билдирүүнүн тексти жеткиликсиз",
    promoTitle: "Ишти жеңилдетебиз, натыйжаны күчөтөбүз",
  },
};

const fallbackRequestTitles = [
  {
    ru: "Заявление на отпуск",
    ky: "Өргүү боюнча арыз",
  },
  {
    ru: "Командировка",
    ky: "Иш сапар",
  },
  {
    ru: "Передача документа",
    ky: "Документ тапшыруу",
  },
  {
    ru: "Материальная помощь",
    ky: "Материалдык жардам",
  },
];

const fallbackMessages = {
  ru: [
    { sender: "Директор", text: "Проверьте документ..." },
    { sender: "Учебная часть", text: "Отправлен новый отчёт..." },
    { sender: "Отдел кадров", text: "Спасибо за информацию!" },
  ],
  ky: [
    { sender: "Директор", text: "Документти текшерип чыктыңыз..." },
    { sender: "Окуу бөлүмү", text: "Жаңы отчёт жөнөтүлдү..." },
    { sender: "Кадр бөлүмү", text: "Маалымат үчүн рахмат!" },
  ],
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
    return <div className="page-loader">{language === "ru" ? "Кабинет загружается..." : "Кабинет жүктөлүүдө..."}</div>;
  }

  const { summary, recentRequests, recentMessages } = data;
  const displayName = readableText(user.fullName, "Бактыбек уулу Байэл") || user.username || "Пользователь";
  const dashboardDate = formatDashboardDate(today, language);

  return (
    <div className="dashboard-model">
      <section className="dashboard-model__hero">
        <div>
          <h1>
            {copy.greeting}, {displayName} <span aria-hidden="true">👋</span>
          </h1>
          <p>{copy.welcome}</p>
        </div>
        <div className="dashboard-model__date">{dashboardDate}</div>
      </section>

      <section className="stat-grid dashboard-model__stats">
        <StatCard
          title={copy.myRequests}
          value={summary.myRequests}
          subtitle={`${copy.inProgress}: 2`}
          accent="orange"
          icon="requests"
          onClick={() => navigate("/requests")}
          ariaLabel={copy.allRequests}
        />
        <StatCard
          title={copy.messages}
          value={summary.inboxMessages}
          subtitle={copy.newItems}
          accent="blue"
          icon="messages"
          onClick={() => navigate("/messages")}
          ariaLabel={copy.allMessages}
        />
        <StatCard
          title={copy.documents}
          value={summary.documents}
          subtitle={copy.official}
          accent="green"
          icon="documents"
          onClick={() => navigate("/documents")}
          ariaLabel={copy.documents}
        />
        <StatCard
          title={copy.notifications}
          value={summary.unreadNotifications}
          subtitle={copy.newItems}
          accent="red"
          icon="notifications"
          onClick={() => navigate("/notifications")}
          ariaLabel={copy.notifications}
        />
      </section>

      <section className="dashboard-model__grid">
        <article className="panel dashboard-model__requests dashboard-requests-card">
          <div className="panel__header">
            <h3>{copy.recentRequests}</h3>
            <Link className="dashboard-requests-card__link" to="/requests">
              {copy.allRequests} →
            </Link>
          </div>
          {recentRequests.length ? (
            <div className="dashboard-requests-table-wrap">
              <div className="dashboard-table dashboard-requests-table">
                <div className="dashboard-table__head">
                  <span>{copy.tableNo}</span>
                  <span>{copy.tableTheme}</span>
                  <span>{copy.tableStatus}</span>
                  <span>{copy.tableDate}</span>
                  <span />
                </div>
                {recentRequests.slice(0, 4).map((item, index) => {
                  const requestTitle = readableText(
                    item.documentTitle || item.type,
                    fallbackRequestTitles[index]?.[language] || fallbackRequestTitles[index]?.ky || copy.unreadSubject
                  );
                  const statusLabel = translateRequestStatus(item.status, language);

                  return (
                    <div className="dashboard-table__row dashboard-request-row" key={item.id}>
                      <span className="dashboard-request-row__number">{index + 1}</span>
                      <strong className="dashboard-request-row__title">{requestTitle}</strong>
                      <span className={`dashboard-status-badge ${getRequestStatusBadgeClass(item.status, language)}`}>
                        {statusLabel}
                      </span>
                      <span className="dashboard-request-row__date">{formatDate(item.createdAt || item.updatedAt, language)}</span>
                      <Link
                        className="dashboard-request-row__action"
                        to={`/requests?request=${encodeURIComponent(item.id)}`}
                        title={copy.tableAction}
                        aria-label={copy.tableAction}
                      >
                        <span aria-hidden="true">↗</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="dashboard-requests-empty">
              <EmptyState title={copy.noRequests} text={copy.noRequestsText} />
            </div>
          )}
        </article>

        <article className="panel dashboard-model__messages">
          <div className="panel__header">
            <h3>{copy.recentMessages}</h3>
            <Link to="/messages">{copy.allMessages} →</Link>
          </div>
          {recentMessages.length ? (
            recentMessages.slice(0, 3).map((item, index) => (
              <Link className="dashboard-message" to="/messages" key={item.id}>
                <span className="dashboard-message__avatar">
                  {readableText(item.senderName, fallbackMessages[language]?.[index]?.sender || "D").charAt(0)}
                </span>
                <span>
                  <strong>{readableText(item.senderName, fallbackMessages[language]?.[index]?.sender || copy.unreadSubject)}</strong>
                  <small>{readableText(item.text, fallbackMessages[language]?.[index]?.text || copy.unreadText)}</small>
                </span>
                <time>{formatDate(item.createdAt, language)}</time>
              </Link>
            ))
          ) : (
            <EmptyState title={copy.noMessages} text={copy.noMessagesText} />
          )}
        </article>

        <article className="dashboard-model__promo">
          <strong>{copy.promoTitle}</strong>
          <div className="dashboard-model__folder" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </article>
      </section>
    </div>
  );
}
