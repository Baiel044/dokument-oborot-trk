import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { translateDepartment } from "../../utils/localization";

const initialForm = {
  receiverId: "",
  departmentId: "",
  subject: "",
  text: "",
};

export function MessagesPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();

    const intervalId = window.setInterval(() => {
      loadPage();
    }, 5000);

    function handleRefresh() {
      loadPage();
    }

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("app:badges-refresh", handleRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("app:badges-refresh", handleRefresh);
    };
  }, []);

  async function loadPage() {
    const [messagesData, usersData, catalogs] = await Promise.all([
      api.get("/api/messages"),
      api.get("/api/users/directory"),
      api.get("/api/meta/catalogs"),
    ]).catch(async () => {
      const fallbackMessages = await api.get("/api/messages");
      const fallbackCatalogs = await api.get("/api/meta/catalogs");
      return [fallbackMessages, { users: [] }, fallbackCatalogs];
    });

    setMessages(messagesData.messages);
    setUsers(usersData.users || []);
    setDepartments(catalogs.departments || []);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const payload = {
        subject: form.subject,
        text: form.text,
        receiverId: form.receiverId || undefined,
        departmentId: form.departmentId || undefined,
      };

      await api.post("/api/messages", payload);
      setForm(initialForm);
      loadPage();
      window.dispatchEvent(new Event("app:badges-refresh"));
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function markAsRead(id) {
    await api.put(`/api/messages/${id}/read`, {});
    await loadPage();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  const unreadCount = messages.filter((item) => item.receiverId === user.id && !item.isRead).length;

  return (
    <div className="page-stack">
      <section className="panel-grid">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel__header">
            <h3>{t("messages.compose")}</h3>
          </div>
          <div className="grid-form">
            <label>
              {t("messages.receiver")}
              <select
                value={form.receiverId}
                onChange={(event) => setForm({ ...form, receiverId: event.target.value, departmentId: "" })}
              >
                <option value="">{t("common.chooseEmployee")}</option>
                {users.map((directoryUser) => (
                  <option key={directoryUser.id} value={directoryUser.id}>
                    {directoryUser.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("messages.orDepartment")}
              <select
                value={form.departmentId}
                onChange={(event) => setForm({ ...form, departmentId: event.target.value, receiverId: "" })}
              >
                <option value="">{t("common.chooseDepartment")}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {translateDepartment(department.id || department.title, language)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("messages.subject")}
              <input
                value={form.subject}
                placeholder={t("messages.subjectPlaceholder")}
                onChange={(event) => setForm({ ...form, subject: event.target.value })}
              />
            </label>
            <label className="grid-form__full">
              {t("messages.text")}
              <textarea
                value={form.text}
                placeholder={t("messages.textPlaceholder")}
                onChange={(event) => setForm({ ...form, text: event.target.value })}
              />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit">
            {t("messages.send")}
          </button>
        </form>

        <section className="panel">
          <div className="panel__header panel__header--with-badge">
            <h3>{t("messages.history")}</h3>
            <span className="panel-counter">
              {t("messages.unread")}: {unreadCount}
            </span>
          </div>
          {messages.length ? (
            messages.map((item) => {
              const isIncoming = item.receiverId === user.id;
              const isUnreadIncoming = isIncoming && !item.isRead;

              return (
                <div className="message-row" key={item.id}>
                  <div className="message-row__content">
                    <div className="message-row__meta">
                      <strong>{item.subject}</strong>
                      <span>
                        {item.senderName} → {item.receiverName}
                      </span>
                    </div>
                    <p>{item.text}</p>
                  </div>

                  <div className="message-row__actions">
                    {isUnreadIncoming ? (
                      <button className="ghost-button" onClick={() => markAsRead(item.id)}>
                        {t("messages.markRead")}
                      </button>
                    ) : isIncoming ? (
                      <span className="tag tag--green">{t("common.read")}</span>
                    ) : (
                      <span className="tag">{t("common.sent")}</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState title={t("messages.noMessages")} text={t("messages.noMessagesText")} />
          )}
        </section>
      </section>
    </div>
  );
}
