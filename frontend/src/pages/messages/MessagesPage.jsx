import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api, buildWebSocketUrl, getAuthToken } from "../../services/api";
import { translateDepartment } from "../../utils/localization";

const initialForm = {
  chatScope: "global",
  receiverId: "",
  departmentId: "",
  subject: "",
  text: "",
};

function isUnreadableText(value) {
  const text = String(value || "").trim();
  const questionMarks = text.match(/\?/g) || [];
  const readablePart = text.replace(/[?\s.,:;!"'()\-–—>«»/\\]+/g, "");
  return questionMarks.length >= 3 && !readablePart;
}

function readableText(value, fallback) {
  return isUnreadableText(value) ? fallback : value;
}

function getLatestMessages(messages, limit = 2) {
  return [...messages]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, limit);
}

export function MessagesPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const targetPartnerId = searchParams.get("partnerId") || "";
  const labels =
    language === "ru"
      ? {
          all: "Все",
          inbox: "Входящие",
          sent: "Исходящие",
          unreadOnly: "Только непрочитанные",
          markAll: "Прочитать все входящие",
          search: "Поиск в переписке",
          searchPlaceholder: "Тема или текст сообщения",
          departmentMessage: "Сообщение отделу",
          directMessage: "Личное сообщение",
          global: "Общий чат",
          globalMessage: "Общий чат",
          chatMode: "Тип чата",
          privateChat: "Личный чат",
          departmentChat: "Отдел",
          realtimeConnected: "Онлайн",
          realtimeConnecting: "Подключение",
          realtimeOffline: "Офлайн",
          wsUnavailable: "WebSocket недоступен, сообщение отправлено через обычный API.",
          readAt: "Прочитано",
          conversation: "Диалог",
          allConversations: "Все переписки",
          showAll: "Показать все",
          unreadableSubject: "Тема недоступна",
          unreadableText: "Текст сообщения недоступен",
        }
      : {
          all: "Бардыгы",
          inbox: "Киргендер",
          sent: "Жөнөтүлгөндөр",
          unreadOnly: "Окулбагандар гана",
          markAll: "Бардык киргендерди окулду кылуу",
          search: "Жазышуудан издөө",
          searchPlaceholder: "Кабар темасы же тексти",
          departmentMessage: "Бөлүмгө кабар",
          directMessage: "Жеке кабар",
          global: "Жалпы чат",
          globalMessage: "Жалпы чат",
          chatMode: "Чат түрү",
          privateChat: "Жеке чат",
          departmentChat: "Бөлүм",
          realtimeConnected: "Онлайн",
          realtimeConnecting: "Туташууда",
          realtimeOffline: "Офлайн",
          wsUnavailable: "WebSocket жеткиликтүү эмес, кабар кадимки API аркылуу жөнөтүлдү.",
          readAt: "Окулган",
          conversation: "Диалог",
          allConversations: "Бардык жазышуулар",
          showAll: "Бардыгын көрүү",
          unreadableSubject: "Тема жеткиликтүү эмес",
          unreadableText: "Кабар тексти жеткиликтүү эмес",
        };
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState({
    scope: "all",
    query: "",
    unreadOnly: false,
    partnerId: targetPartnerId,
  });
  const [error, setError] = useState("");
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [socketStatus, setSocketStatus] = useState("connecting");
  const socketRef = useRef(null);
  const loadPageRef = useRef(null);

  loadPageRef.current = loadPage;

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setSocketStatus("offline");
      return undefined;
    }

    const socket = new WebSocket(buildWebSocketUrl(`/api/messages/ws?token=${encodeURIComponent(token)}`));
    socketRef.current = socket;
    setSocketStatus("connecting");

    socket.addEventListener("open", () => setSocketStatus("connected"));
    socket.addEventListener("close", () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setSocketStatus("offline");
    });
    socket.addEventListener("error", () => setSocketStatus("offline"));
    socket.addEventListener("message", (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch (_error) {
        return;
      }

      if (payload.type === "chat:error") {
        setError(payload.message);
        return;
      }

      if (payload.type === "chat:message") {
        loadPageRef.current?.();
        window.dispatchEvent(new Event("app:badges-refresh"));
      }
    });

    return () => {
      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setShowAllMessages(false);
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
  }, [filters.scope, filters.query, filters.unreadOnly, filters.partnerId]);

  useEffect(() => {
    if (targetPartnerId) {
      setFilters((current) => ({ ...current, partnerId: targetPartnerId, scope: "all" }));
      setForm((current) => ({ ...current, chatScope: "direct", receiverId: targetPartnerId, departmentId: "" }));
    }
  }, [targetPartnerId]);

  async function loadPage() {
    const params = new URLSearchParams();
    params.set("scope", filters.scope);
    if (filters.query.trim()) {
      params.set("q", filters.query.trim());
    }
    if (filters.unreadOnly) {
      params.set("unread", "true");
    }
    if (filters.partnerId) {
      params.set("partnerId", filters.partnerId);
    }

    const [messagesData, usersData, catalogs] = await Promise.all([
      api.get(`/api/messages?${params.toString()}`),
      api.get("/api/users/directory"),
      api.get("/api/meta/catalogs"),
    ]).catch(async () => {
      const fallbackMessages = await api.get(`/api/messages?${params.toString()}`);
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
      const socket = socketRef.current;
      const canUseSocket = socket && socket.readyState === WebSocket.OPEN;
      const basePayload = {
        type: "chat:send",
        subject: form.subject,
        text: form.text,
      };

      if (form.chatScope === "global") {
        const payload = { ...basePayload, chatScope: "global" };
        if (canUseSocket) {
          socket.send(JSON.stringify(payload));
        } else {
          await api.post("/api/messages", payload);
          setError(labels.wsUnavailable);
        }
        setFilters((current) => ({ ...current, scope: "global", partnerId: "" }));
      } else if (form.chatScope === "direct") {
        if (!form.receiverId) {
          throw new Error(t("common.chooseEmployee"));
        }
        const payload = { ...basePayload, chatScope: "direct", receiverId: form.receiverId };
        if (canUseSocket) {
          socket.send(JSON.stringify(payload));
        } else {
          await api.post("/api/messages", payload);
          setError(labels.wsUnavailable);
        }
        setFilters((current) => ({ ...current, partnerId: form.receiverId, scope: "all" }));
      } else {
        await api.post("/api/messages", {
          subject: form.subject,
          text: form.text,
          departmentId: form.departmentId || undefined,
        });
      }
      setForm({ ...initialForm, chatScope: form.chatScope, receiverId: form.chatScope === "direct" ? form.receiverId : "" });
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

  async function markAllInboxAsRead() {
    await api.put("/api/messages/read-all/inbox", {});
    await loadPage();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  const unreadCount = messages.filter((item) => item.receiverId === user.id && !item.isRead).length;
  const visibleMessages = showAllMessages ? messages : getLatestMessages(messages, 2);
  const socketStatusLabel =
    socketStatus === "connected"
      ? labels.realtimeConnected
      : socketStatus === "connecting"
        ? labels.realtimeConnecting
        : labels.realtimeOffline;

  return (
    <div className="page-stack">
      <section className="panel-grid">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel__header">
            <h3>{t("messages.compose")}</h3>
            <span className={`realtime-pill realtime-pill--${socketStatus}`}>{socketStatusLabel}</span>
          </div>
          <div className="grid-form">
            <label className="grid-form__full">
              {labels.chatMode}
              <select
                value={form.chatScope}
                onChange={(event) =>
                  setForm({
                    ...form,
                    chatScope: event.target.value,
                    receiverId: "",
                    departmentId: "",
                  })
                }
              >
                <option value="global">{labels.global}</option>
                <option value="direct">{labels.privateChat}</option>
                <option value="department">{labels.departmentChat}</option>
              </select>
            </label>
            {form.chatScope === "direct" ? (
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
            ) : null}
            {form.chatScope === "department" ? (
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
            ) : null}
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
            <div>
              <h3>{t("messages.history")}</h3>
              <p className="muted-text">
                {t("messages.unread")}: {unreadCount}
              </p>
            </div>
            {unreadCount ? (
              <button className="ghost-button" onClick={markAllInboxAsRead}>
                {labels.markAll}
              </button>
            ) : null}
            {messages.length > 2 && !showAllMessages ? (
              <button className="ghost-button" type="button" onClick={() => setShowAllMessages(true)}>
                {labels.showAll}
              </button>
            ) : null}
          </div>

          <div className="message-filters">
            <div className="segmented-control">
              {[
                ["all", labels.all],
                ["global", labels.global],
                ["inbox", labels.inbox],
                ["sent", labels.sent],
              ].map(([scope, label]) => (
                <button
                  className={filters.scope === scope ? "segmented-control__item segmented-control__item--active" : "segmented-control__item"}
                  key={scope}
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({ ...current, scope, partnerId: scope === "global" ? "" : current.partnerId }))
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="checkbox-line message-filters__unread">
              <input
                type="checkbox"
                checked={filters.unreadOnly}
                onChange={(event) => setFilters((current) => ({ ...current, unreadOnly: event.target.checked }))}
              />
              {labels.unreadOnly}
            </label>
            <label className="message-filters__conversation">
              {labels.conversation}
              <select
                value={filters.partnerId}
                onChange={(event) => setFilters((current) => ({ ...current, partnerId: event.target.value, scope: "all" }))}
              >
                <option value="">{labels.allConversations}</option>
                {users.map((directoryUser) => (
                  <option key={directoryUser.id} value={directoryUser.id}>
                    {directoryUser.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="message-filters__search">
              {labels.search}
              <input
                value={filters.query}
                placeholder={labels.searchPlaceholder}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              />
            </label>
          </div>

          {messages.length ? (
            visibleMessages.map((item) => {
              const isGlobal = item.audienceType === "global";
              const isIncoming = item.receiverId === user.id;
              const isUnreadIncoming = isIncoming && !item.isRead;
              const subject = readableText(item.subject, labels.unreadableSubject);
              const text = readableText(item.text, labels.unreadableText);

              return (
                <div
                  className={`message-row ${
                    targetPartnerId && [item.senderId, item.receiverId].includes(targetPartnerId) ? "row-highlight" : ""
                  }`}
                  key={item.id}
                >
                  <div className="message-row__content">
                    <div className="message-row__meta">
                      <strong>{subject}</strong>
                      <span>
                        {item.senderName} →{" "}
                        {item.audienceType === "department" && item.departmentTitle
                          ? `${item.departmentTitle} (${item.receiverName})`
                          : item.receiverName}
                      </span>
                    </div>
                    <span
                      className={`tag ${isGlobal ? "tag--green" : item.audienceType === "department" ? "tag--orange" : ""}`}
                    >
                      {isGlobal
                        ? labels.globalMessage
                        : item.audienceType === "department"
                          ? labels.departmentMessage
                          : labels.directMessage}
                    </span>
                    <p>{text}</p>
                    {item.readAt ? (
                      <p className="muted-text">
                        {labels.readAt}: {new Date(item.readAt).toLocaleString(language === "ru" ? "ru-RU" : "ky-KG")}
                      </p>
                    ) : null}
                  </div>

                  <div className="message-row__actions">
                    {isGlobal ? (
                      <span className="tag tag--green">{labels.globalMessage}</span>
                    ) : isUnreadIncoming ? (
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
