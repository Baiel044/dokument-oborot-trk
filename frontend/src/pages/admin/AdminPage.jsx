import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { UserPlus } from "lucide-react";
import { api } from "../../services/api";
import { CreateUserPanel } from "./CreateUserPanel";
import {
  getLocale,
  translateAuditAction,
  translateDepartment,
  translateRole,
  translateUserStatus,
} from "../../utils/localization";

const roleOptions = ["ADMIN", "DIRECTOR", "ACADEMIC_OFFICE", "HR", "ACCOUNTANT", "TEACHER"];
const departmentOptions = ["general", "teaching", "academic-office", "hr", "accounting", "it"];
const statusOptions = ["active", "pending", "blocked"];

function buildUserDraft(user) {
  return {
    fullName: user.fullName || "",
    email: user.email || "",
    phone: user.phone || "",
    username: user.username || "",
    password: "",
    position: user.position || "",
    departmentId: user.departmentId || "general",
    roleCode: user.roleCode || "TEACHER",
    status: user.status || "pending",
  };
}

export function AdminPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditEntityTypes, setAuditEntityTypes] = useState([]);
  const [auditFilters, setAuditFilters] = useState({
    query: "",
    entityType: "",
    userId: "",
    dateFrom: "",
    dateTo: "",
    limit: "100",
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const selectedUserId = searchParams.get("user");
  const visibleUsers = selectedUserId ? users.filter((item) => item.id === selectedUserId) : users;

  const labels =
    language === "ru"
      ? {
          usersAccess: "Пользователи и доступы",
          addUser: "Добавить пользователя",
          login: "Логин",
          password: "Новый пароль",
          passwordPlaceholder: "Задать новый пароль",
          passwordNote: "Текущий пароль не показывается: он хранится в зашифрованном виде.",
          fullName: "ФИО",
          email: "Email",
          phone: "Телефон",
          position: "Должность",
          department: "Подразделение",
          role: "Роль",
          status: "Статус",
          save: "Сохранить",
          delete: "Удалить",
          saved: "Пользователь обновлён.",
          approved: "Пользователь подтверждён.",
          rejected: "Регистрация отклонена.",
          deleted: "Пользователь удалён.",
          confirmDelete: "Удалить пользователя",
          confirmReject: "Отклонить регистрацию",
          rejectReason: "Причина отклонения",
          reject: "Отклонить",
          onlyAdmin: "Редактирование логинов, паролей и удаление доступно только администратору.",
          directorAccess: "Директор может подтверждать новые аккаунты и просматривать журнал действий. Редактирование карточек выполняет администратор.",
          searchFilter: "Показан пользователь из поиска",
          showAll: "Показать всех пользователей",
          userNotFound: "Пользователь из поиска не найден.",
          auditFilters: "Фильтры журнала",
          allEvents: "Все события",
          allUsers: "Все пользователи",
          searchAudit: "Поиск в журнале",
          dateFrom: "С даты",
          dateTo: "По дату",
          limit: "Лимит",
          applyFilters: "Применить",
          resetFilters: "Сбросить",
          exportAuditCsv: "Скачать CSV журнала",
          exportAuditError: "Не удалось скачать журнал действий.",
          entity: "Объект",
          actor: "Пользователь",
          ipAddress: "IP",
          userAgent: "Браузер",
        }
      : {
          usersAccess: "Колдонуучулар жана жеткиликтүүлүк",
          addUser: "Колдонуучу кошуу",
          login: "Логин",
          password: "Жаңы сырсөз",
          passwordPlaceholder: "Жаңы сырсөз коюу",
          passwordNote: "Учурдагы сырсөз көрсөтүлбөйт: ал шифрленген түрдө сакталат.",
          fullName: "Аты-жөнү",
          email: "Email",
          phone: "Телефон",
          position: "Кызматы",
          department: "Бөлүм",
          role: "Ролу",
          status: "Абалы",
          save: "Сактоо",
          delete: "Өчүрүү",
          saved: "Колдонуучу жаңыртылды.",
          approved: "Колдонуучу тастыкталды.",
          rejected: "Катталуу четке кагылды.",
          deleted: "Колдонуучу өчүрүлдү.",
          confirmDelete: "Колдонуучуну өчүрүү",
          confirmReject: "Катталууну четке кагуу",
          rejectReason: "Четке кагуу себеби",
          reject: "Четке кагуу",
          onlyAdmin: "Логин, сырсөз өзгөртүү жана өчүрүү администраторго гана жеткиликтүү.",
          directorAccess: "Директор жаңы аккаунттарды тастыктай алат жана аракеттер журналын көрөт. Карточкаларды администратор түзөтөт.",
          searchFilter: "Издөөдөн тандалган колдонуучу көрсөтүлдү",
          showAll: "Бардык колдонуучуларды көрсөтүү",
          userNotFound: "Издөөдөн тандалган колдонуучу табылган жок.",
          auditFilters: "Журнал чыпкалары",
          allEvents: "Бардык окуялар",
          allUsers: "Бардык колдонуучулар",
          searchAudit: "Журналдан издөө",
          dateFrom: "Баштапкы дата",
          dateTo: "Акыркы дата",
          limit: "Чек",
          applyFilters: "Колдонуу",
          resetFilters: "Тазалоо",
          exportAuditCsv: "Журнал CSV жүктөө",
          exportAuditError: "Аракеттер журналын жүктөө мүмкүн болгон жок.",
          entity: "Объект",
          actor: "Колдонуучу",
          ipAddress: "IP",
          userAgent: "Браузер",
        };

  useEffect(() => {
    loadAdminData();
  }, []);

  function buildAuditQuery(filters = auditFilters) {
    const params = new URLSearchParams();
    if (filters.query.trim()) {
      params.set("q", filters.query.trim());
    }
    if (filters.entityType) {
      params.set("entityType", filters.entityType);
    }
    if (filters.userId) {
      params.set("userId", filters.userId);
    }
    if (filters.dateFrom) {
      params.set("dateFrom", filters.dateFrom);
    }
    if (filters.dateTo) {
      params.set("dateTo", filters.dateTo);
    }
    if (filters.limit) {
      params.set("limit", filters.limit);
    }

    const query = params.toString();
    return query ? `/api/audit-logs?${query}` : "/api/audit-logs";
  }

  async function loadAdminData() {
    try {
      const [logsData, pendingData, usersData] = await Promise.all([
        api.get(buildAuditQuery()),
        api.get("/api/users?status=pending"),
        api.get("/api/users"),
      ]);

      setAuditLogs(logsData.auditLogs);
      setAuditEntityTypes(logsData.entityTypes || []);
      setPendingUsers(pendingData.users);
      setUsers(usersData.users);
      setDrafts(
        usersData.users.reduce((result, item) => {
          result[item.id] = buildUserDraft(item);
          return result;
        }, {})
      );
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    }
  }

  function updateAuditFilter(field, value) {
    setAuditFilters((current) => ({ ...current, [field]: value }));
  }

  async function applyAuditFilters(event) {
    event.preventDefault();
    await loadAdminData();
  }

  async function resetAuditFilters() {
    const nextFilters = {
      query: "",
      entityType: "",
      userId: "",
      dateFrom: "",
      dateTo: "",
      limit: "100",
    };
    setAuditFilters(nextFilters);

    try {
      const logsData = await api.get(buildAuditQuery(nextFilters));
      setAuditLogs(logsData.auditLogs);
      setAuditEntityTypes(logsData.entityTypes || []);
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    }
  }

  async function downloadAuditCsv() {
    const query = buildAuditQuery().split("?")[1];
    const path = query ? `/api/audit-logs/export.csv?${query}` : "/api/audit-logs/export.csv";

    try {
      const blob = await api.download(path);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (_error) {
      setFeedback({ type: "error", text: labels.exportAuditError });
    }
  }

  function updateDraft(userId, field, value) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value,
      },
    }));
  }

  async function saveUser(userId) {
    const draft = drafts[userId];
    if (!draft) {
      return;
    }

    try {
      setFeedback({ type: "", text: "" });
      await api.put(`/api/users/${userId}`, {
        fullName: draft.fullName,
        email: draft.email,
        phone: draft.phone,
        username: draft.username,
        password: draft.password,
        position: draft.position,
        departmentId: draft.departmentId,
        roleCode: draft.roleCode,
        status: draft.status,
      });
      setFeedback({ type: "success", text: labels.saved });
      await loadAdminData();
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    }
  }

  async function deleteUser(item) {
    const confirmed = window.confirm(`${labels.confirmDelete}: ${item.fullName}?`);
    if (!confirmed) {
      return;
    }

    try {
      setFeedback({ type: "", text: "" });
      await api.delete(`/api/users/${item.id}`);
      setFeedback({ type: "success", text: labels.deleted });
      await loadAdminData();
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    }
  }

  async function approveUser(userId) {
    try {
      setFeedback({ type: "", text: "" });
      await api.post(`/api/users/${userId}/approve`, {});
      setFeedback({ type: "success", text: labels.approved });
      await loadAdminData();
      window.dispatchEvent(new Event("app:badges-refresh"));
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    }
  }

  async function rejectUser(item) {
    const reason = window.prompt(`${labels.confirmReject}: ${item.fullName}\n${labels.rejectReason}`, "");
    if (reason === null) {
      return;
    }

    try {
      setFeedback({ type: "", text: "" });
      await api.post(`/api/users/${item.id}/reject`, { reason });
      setFeedback({ type: "success", text: labels.rejected });
      await loadAdminData();
      window.dispatchEvent(new Event("app:badges-refresh"));
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    }
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel__header">
          <div>
            <h3>{labels.usersAccess}</h3>
            <p className="muted-text">{labels.passwordNote}</p>
          </div>
          {user.roleCode === "ADMIN" && !isCreateOpen ? (
            <button className="btn btn-primary" type="button" onClick={() => setIsCreateOpen(true)}>
              <UserPlus size={18} aria-hidden="true" />
              {labels.addUser}
            </button>
          ) : null}
        </div>

        {user.roleCode === "ADMIN" && isCreateOpen ? (
          <CreateUserPanel
            language={language}
            onCreated={() => loadAdminData()}
            onClose={() => setIsCreateOpen(false)}
          />
        ) : null}

        {feedback.text ? (
          <p className={`form-alert form-alert--${feedback.type}`}>{feedback.text}</p>
        ) : null}

        {user.roleCode !== "ADMIN" ? <p className="muted-text">{labels.directorAccess}</p> : null}

        {selectedUserId ? (
          <div className="admin-filter">
            <span>{visibleUsers.length ? labels.searchFilter : labels.userNotFound}</span>
            <button className="ghost-button" onClick={() => setSearchParams({})}>
              {labels.showAll}
            </button>
          </div>
        ) : null}

        <div className="admin-user-list">
          {visibleUsers.map((item) => {
            const draft = drafts[item.id] || buildUserDraft(item);
            const isSelf = item.id === user.id;

            return (
              <article className="admin-user-card" key={item.id}>
                <div className="admin-user-card__header">
                  <div>
                    <strong>{item.fullName}</strong>
                    <p>
                      {translateRole(item.roleCode || item.roleTitle, language)} ·{" "}
                      {translateUserStatus(item.status, language)}
                    </p>
                  </div>
                  <span className="tag">{item.username}</span>
                </div>

                <div className="admin-user-card__form">
                  <label className="field">
                    <span>{labels.fullName}</span>
                    <input
                      value={draft.fullName}
                      disabled={user.roleCode !== "ADMIN"}
                      onChange={(event) => updateDraft(item.id, "fullName", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{labels.login}</span>
                    <input
                      value={draft.username}
                      disabled={user.roleCode !== "ADMIN"}
                      onChange={(event) => updateDraft(item.id, "username", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{labels.email}</span>
                    <input
                      type="email"
                      value={draft.email}
                      disabled={user.roleCode !== "ADMIN"}
                      onChange={(event) => updateDraft(item.id, "email", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{labels.password}</span>
                    <input
                      type="password"
                      value={draft.password}
                      placeholder={labels.passwordPlaceholder}
                      disabled={user.roleCode !== "ADMIN"}
                      onChange={(event) => updateDraft(item.id, "password", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{labels.phone}</span>
                    <input
                      value={draft.phone}
                      disabled={user.roleCode !== "ADMIN"}
                      onChange={(event) => updateDraft(item.id, "phone", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{labels.position}</span>
                    <input
                      value={draft.position}
                      disabled={user.roleCode !== "ADMIN"}
                      onChange={(event) => updateDraft(item.id, "position", event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{labels.department}</span>
                    <select
                      value={draft.departmentId}
                      disabled={user.roleCode !== "ADMIN"}
                      onChange={(event) => updateDraft(item.id, "departmentId", event.target.value)}
                    >
                      {departmentOptions.map((department) => (
                        <option key={department} value={department}>
                          {translateDepartment(department, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{labels.role}</span>
                    <select
                      value={draft.roleCode}
                      disabled={user.roleCode !== "ADMIN"}
                      onChange={(event) => updateDraft(item.id, "roleCode", event.target.value)}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {translateRole(role, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{labels.status}</span>
                    <select
                      value={draft.status}
                      disabled={user.roleCode !== "ADMIN"}
                      onChange={(event) => updateDraft(item.id, "status", event.target.value)}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {translateUserStatus(status, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {user.roleCode === "ADMIN" ? (
                  <div className="inline-actions">
                    <button className="primary-button" onClick={() => saveUser(item.id)}>
                      {labels.save}
                    </button>
                    <button
                      className="danger-button"
                      disabled={isSelf}
                      onClick={() => deleteUser(item)}
                    >
                      {labels.delete}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <div className="panel__header">
            <h3>{t("admin.pendingUsers")}</h3>
          </div>
          {pendingUsers.length ? (
            pendingUsers.map((item) => (
              <div className="summary-row" key={item.id}>
                <span>{item.fullName}</span>
                <div className="inline-actions">
                  <strong>{translateRole(item.roleCode || item.roleTitle, language)}</strong>
                  <button className="ghost-button" onClick={() => approveUser(item.id)}>
                    {t("users.approve")}
                  </button>
                  <button className="danger-button" onClick={() => rejectUser(item)}>
                    {labels.reject}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="muted-text">{t("admin.noPendingUsers")}</p>
          )}
        </article>

        <article className="panel panel--wide">
          <div className="panel__header">
            <div>
              <h3>{t("admin.auditLog")}</h3>
              <p className="muted-text">
                {labels.limit}: {auditLogs.length}
              </p>
            </div>
          </div>

          <form className="audit-filters" onSubmit={applyAuditFilters}>
            <label>
              {labels.searchAudit}
              <input value={auditFilters.query} onChange={(event) => updateAuditFilter("query", event.target.value)} />
            </label>
            <label>
              {labels.auditFilters}
              <select
                value={auditFilters.entityType}
                onChange={(event) => updateAuditFilter("entityType", event.target.value)}
              >
                <option value="">{labels.allEvents}</option>
                {auditEntityTypes.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {entityType}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {labels.actor}
              <select value={auditFilters.userId} onChange={(event) => updateAuditFilter("userId", event.target.value)}>
                <option value="">{labels.allUsers}</option>
                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {labels.dateFrom}
              <input
                type="date"
                value={auditFilters.dateFrom}
                onChange={(event) => updateAuditFilter("dateFrom", event.target.value)}
              />
            </label>
            <label>
              {labels.dateTo}
              <input
                type="date"
                value={auditFilters.dateTo}
                onChange={(event) => updateAuditFilter("dateTo", event.target.value)}
              />
            </label>
            <label>
              {labels.limit}
              <select value={auditFilters.limit} onChange={(event) => updateAuditFilter("limit", event.target.value)}>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
              </select>
            </label>
            <div className="inline-actions audit-filters__actions">
              <button className="primary-button" type="submit">
                {labels.applyFilters}
              </button>
              <button className="ghost-button" type="button" onClick={resetAuditFilters}>
                {labels.resetFilters}
              </button>
              <button className="ghost-button" type="button" onClick={downloadAuditCsv}>
                {labels.exportAuditCsv}
              </button>
            </div>
          </form>

          {auditLogs.map((item) => (
            <div className="summary-row" key={item.id}>
              <span>
                {translateAuditAction(item.action, language)}
                <small>
                  {labels.actor}: {item.userName || item.userId} · {labels.entity}: {item.entityType}/{item.entityId}
                </small>
                {item.ipAddress || item.userAgent ? (
                  <small>
                    {labels.ipAddress}: {item.ipAddress || "-"} · {labels.userAgent}: {item.userAgent || "-"}
                  </small>
                ) : null}
              </span>
              <strong>{new Date(item.createdAt).toLocaleString(getLocale(language))}</strong>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
