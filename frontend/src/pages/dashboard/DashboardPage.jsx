import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "../../components/ui/StatCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { translateRequestStatus } from "../../utils/localization";

const roleUx = {
  ru: {
    TEACHER: {
      title: "Рабочий кабинет преподавателя",
      text: "Быстро отправьте заявление директору, приложите документ и отслеживайте статус согласования.",
      actions: [
        { label: "Подать заявление", to: "/requests", primary: true },
        { label: "Написать сообщение", to: "/messages" },
        { label: "Загрузить документ", to: "/documents" },
      ],
    },
    DIRECTOR: {
      title: "Очередь директора",
      text: "Проверьте входящие обращения, подпишите официальный PDF и направьте документ в кадры или бухгалтерию.",
      actions: [
        { label: "Документы на подпись", to: "/requests", primary: true },
        { label: "Пользователи", to: "/users" },
        { label: "Отчёты", to: "/reports" },
      ],
    },
    ACADEMIC_OFFICE: {
      title: "Кабинет учебной части",
      text: "Контролируйте подтверждённые отсутствия преподавателей, замены занятий и служебные распоряжения.",
      actions: [
        { label: "Заявления", to: "/requests", primary: true },
        { label: "Сообщения", to: "/messages" },
        { label: "Документы", to: "/documents" },
      ],
    },
    HR: {
      title: "Кабинет отдела кадров",
      text: "Работайте с кадровыми заявлениями, отпусками, личными данными сотрудников и отчётами.",
      actions: [
        { label: "Кадровые документы", to: "/requests", primary: true },
        { label: "Сотрудники", to: "/users" },
        { label: "Отчёты", to: "/reports" },
      ],
    },
    ACCOUNTANT: {
      title: "Кабинет бухгалтерии",
      text: "Проверяйте утверждённые документы, которые влияют на начисления и внутренние расчёты.",
      actions: [
        { label: "Документы к обработке", to: "/requests", primary: true },
        { label: "Архив документов", to: "/documents" },
        { label: "Отчёты", to: "/reports" },
      ],
    },
    ADMIN: {
      title: "Администрирование системы",
      text: "Управляйте пользователями, ролями, доступами и контролируйте журнал действий.",
      actions: [
        { label: "Админ-панель", to: "/admin", primary: true },
        { label: "Пользователи", to: "/users" },
        { label: "Отчёты", to: "/reports" },
      ],
    },
    statusTitle: "Контроль статусов",
    statusText: "Цвета помогают быстро понять, где находится документ.",
    statuses: [
      { label: "Черновик", tone: "neutral" },
      { label: "На рассмотрении", tone: "warning" },
      { label: "Подписано", tone: "success" },
      { label: "Возвращено", tone: "danger" },
    ],
  },
  ky: {
    TEACHER: {
      title: "Окутуучунун кабинети",
      text: "Директорго арыз жөнөтүп, документ тиркеп, макулдашуу абалын көзөмөлдөңүз.",
      actions: [
        { label: "Арыз берүү", to: "/requests", primary: true },
        { label: "Кабар жазуу", to: "/messages" },
        { label: "Документ жүктөө", to: "/documents" },
      ],
    },
    DIRECTOR: {
      title: "Директордун кезеги",
      text: "Келген кайрылууларды карап, расмий PDFке кол коюп, кадрларга же бухгалтерияга жөнөтүңүз.",
      actions: [
        { label: "Кол коюлуучу документтер", to: "/requests", primary: true },
        { label: "Колдонуучулар", to: "/users" },
        { label: "Отчёттор", to: "/reports" },
      ],
    },
    ACADEMIC_OFFICE: {
      title: "Окуу бөлүмүнүн кабинети",
      text: "Окутуучулардын тастыкталган жок болушун, сабак алмашууну жана ички буйруктарды көзөмөлдөңүз.",
      actions: [
        { label: "Арыздар", to: "/requests", primary: true },
        { label: "Кабарлар", to: "/messages" },
        { label: "Документтер", to: "/documents" },
      ],
    },
    HR: {
      title: "Кадрлар бөлүмүнүн кабинети",
      text: "Кадрдык арыздар, өргүүлөр, кызматкерлердин маалыматтары жана отчёттор менен иштеңиз.",
      actions: [
        { label: "Кадрдык документтер", to: "/requests", primary: true },
        { label: "Кызматкерлер", to: "/users" },
        { label: "Отчёттор", to: "/reports" },
      ],
    },
    ACCOUNTANT: {
      title: "Бухгалтерия кабинети",
      text: "Айлык эсептөөгө таасир берген бекитилген документтерди жана ички эсептерди текшериңиз.",
      actions: [
        { label: "Иштелүүчү документтер", to: "/requests", primary: true },
        { label: "Документ архиви", to: "/documents" },
        { label: "Отчёттор", to: "/reports" },
      ],
    },
    ADMIN: {
      title: "Системаны администрлөө",
      text: "Колдонуучуларды, ролдорду, жеткиликтүүлүктү жана аракеттер журналын башкарыңыз.",
      actions: [
        { label: "Админ-панель", to: "/admin", primary: true },
        { label: "Колдонуучулар", to: "/users" },
        { label: "Отчёттор", to: "/reports" },
      ],
    },
    statusTitle: "Статустарды көзөмөлдөө",
    statusText: "Түстөр документ кайсы этапта экенин тез түшүнүүгө жардам берет.",
    statuses: [
      { label: "Долбоор", tone: "neutral" },
      { label: "Каралууда", tone: "warning" },
      { label: "Кол коюлду", tone: "success" },
      { label: "Кайтарылды", tone: "danger" },
    ],
  },
};

export function DashboardPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/api/dashboard").then(setData).catch(() => null);
  }, []);

  if (!data) {
    return <div className="page-loader">{t("dashboard.loading")}</div>;
  }

  const { summary, recentRequests, recentMessages, recentNotifications } = data;
  const uxCopy = roleUx[language] || roleUx.ky;
  const rolePanel = uxCopy[user.roleCode] || uxCopy.TEACHER;

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="section-kicker">{t("dashboard.kicker")}</span>
          <h2>{t("dashboard.title")}</h2>
        </div>
        <p>{t("dashboard.description")}</p>
      </section>

      <section className="ux-grid">
        <article className="ux-card ux-card--primary">
          <span className="section-kicker">{rolePanel.title}</span>
          <p>{rolePanel.text}</p>
          <div className="ux-actions">
            {rolePanel.actions.map((action) => (
              <Link
                className={action.primary ? "primary-button" : "ghost-button"}
                key={action.to}
                to={action.to}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </article>

        <article className="ux-card">
          <span className="section-kicker">{uxCopy.statusTitle}</span>
          <p>{uxCopy.statusText}</p>
          <div className="status-legend">
            {uxCopy.statuses.map((status) => (
              <span className={`status-pill status-pill--${status.tone}`} key={status.label}>
                {status.label}
              </span>
            ))}
          </div>
        </article>
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
