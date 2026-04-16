import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
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
  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const labels =
    language === "ru"
      ? {
          usersAccess: "Пользователи и доступы",
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
          deleted: "Пользователь удалён.",
          confirmDelete: "Удалить пользователя",
          onlyAdmin: "Редактирование логинов, паролей и удаление доступно только администратору.",
        }
      : {
          usersAccess: "Колдонуучулар жана жеткиликтүүлүк",
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
          deleted: "Колдонуучу өчүрүлдү.",
          confirmDelete: "Колдонуучуну өчүрүү",
          onlyAdmin: "Логин, сырсөз өзгөртүү жана өчүрүү администраторго гана жеткиликтүү.",
        };

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    try {
      const [logsData, pendingData, usersData] = await Promise.all([
        api.get("/api/audit-logs"),
        api.get("/api/users?status=pending"),
        api.get("/api/users"),
      ]);

      setAuditLogs(logsData.auditLogs);
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

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel__header">
          <div>
            <h3>{labels.usersAccess}</h3>
            <p className="muted-text">{labels.passwordNote}</p>
          </div>
        </div>

        {feedback.text ? (
          <p className={`form-alert form-alert--${feedback.type}`}>{feedback.text}</p>
        ) : null}

        {user.roleCode !== "ADMIN" ? <p className="muted-text">{labels.onlyAdmin}</p> : null}

        <div className="admin-user-list">
          {users.map((item) => {
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
                <strong>{translateRole(item.roleCode || item.roleTitle, language)}</strong>
              </div>
            ))
          ) : (
            <p className="muted-text">{t("admin.noPendingUsers")}</p>
          )}
        </article>

        <article className="panel panel--wide">
          <div className="panel__header">
            <h3>{t("admin.auditLog")}</h3>
          </div>
          {auditLogs.map((item) => (
            <div className="summary-row" key={item.id}>
              <span>{translateAuditAction(item.action, language)}</span>
              <strong>{new Date(item.createdAt).toLocaleString(getLocale(language))}</strong>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
