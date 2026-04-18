import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
const pageSizeOptions = [5, 10, 20, 50];

const roleLabels = {
  ru: {
    ADMIN: "Админ",
    DIRECTOR: "Директор",
    ACADEMIC_OFFICE: "Учебная часть",
    HR: "Кадры",
    ACCOUNTANT: "Бухгалтер",
    TEACHER: "Преподаватель",
  },
  ky: {
    ADMIN: "Админ",
    DIRECTOR: "Директор",
    ACADEMIC_OFFICE: "Окуу бөлүмү",
    HR: "Кадрлар",
    ACCOUNTANT: "Бухгалтер",
    TEACHER: "Окутуучу",
  },
};

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

function getRoleLabel(role, language) {
  return roleLabels[language]?.[role] || translateRole(role, language) || role;
}

function escapeExcelCell(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let value = "Trk-";

  for (let index = 0; index < 8; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `${value}!`;
}

export function AdminPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [adminSearch, setAdminSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const selectedUserId = searchParams.get("user");

  const labels =
    language === "ru"
      ? {
          adminPanel: "Админ панель",
          usersAccess: "Пользователи и доступы",
          searchPlaceholder: "Поиск по имени или email",
          exportExcel: "Экспорт в Excel",
          number: "№",
          name: "Имя",
          login: "Логин",
          email: "Email",
          role: "Роль",
          teacher: "Преподаватель",
          password: "Пароль",
          passwordPlaceholder: "Новый пароль",
          save: "Сохранить",
          generate: "Сгенерировать",
          delete: "Удалить",
          saved: "Пользователь обновлён.",
          deleted: "Пользователь удалён.",
          confirmDelete: "Удалить пользователя",
          onlyAdmin: "Редактирование логинов, паролей и удаление доступно только администратору.",
          searchFilter: "Показан пользователь из поиска",
          showAll: "Показать всех пользователей",
          userNotFound: "Пользователь из поиска не найден.",
          noUsers: "Пользователи не найдены.",
          actions: "Действия",
          showPassword: "Показать пароль",
          hidePassword: "Скрыть пароль",
        }
      : {
          adminPanel: "Админ панель",
          usersAccess: "Колдонуучулар жана жеткиликтүүлүк",
          searchPlaceholder: "Аты же email боюнча издөө",
          exportExcel: "Excelге экспорт",
          number: "№",
          name: "Аты",
          login: "Логин",
          email: "Email",
          role: "Ролу",
          teacher: "Окутуучу",
          password: "Сырсөз",
          passwordPlaceholder: "Жаңы сырсөз",
          save: "Сактоо",
          generate: "Генерация",
          delete: "Өчүрүү",
          saved: "Колдонуучу жаңыртылды.",
          deleted: "Колдонуучу өчүрүлдү.",
          confirmDelete: "Колдонуучуну өчүрүү",
          onlyAdmin: "Логин, сырсөз өзгөртүү жана өчүрүү администраторго гана жеткиликтүү.",
          searchFilter: "Издөөдөн тандалган колдонуучу көрсөтүлдү",
          showAll: "Бардык колдонуучуларды көрсөтүү",
          userNotFound: "Издөөдөн тандалган колдонуучу табылган жок.",
          noUsers: "Колдонуучулар табылган жок.",
          actions: "Аракеттер",
          showPassword: "Сырсөздү көрсөтүү",
          hidePassword: "Сырсөздү жашыруу",
        };

  const selectedUsers = selectedUserId ? users.filter((item) => item.id === selectedUserId) : users;
  const filteredUsers = selectedUsers.filter((item) => {
    const query = adminSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [item.fullName, item.email, item.username, item.position, item.roleTitle]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query));
  });
  const displayedUsers = filteredUsers.slice(0, pageSize);

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

  function updateTeacherRole(userId, checked) {
    updateDraft(userId, "roleCode", checked ? "TEACHER" : "ADMIN");
  }

  function fillGeneratedPassword(userId) {
    updateDraft(userId, "password", generatePassword());
    setVisiblePasswords((current) => ({ ...current, [userId]: true }));
  }

  function togglePassword(userId) {
    setVisiblePasswords((current) => ({ ...current, [userId]: !current[userId] }));
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

  function exportUsers() {
    const rows = filteredUsers.map((item, index) => {
      const draft = drafts[item.id] || buildUserDraft(item);
      return [
        index + 1,
        draft.fullName,
        draft.email,
        draft.username,
        getRoleLabel(draft.roleCode, language),
        draft.position,
        translateDepartment(draft.departmentId, language),
        translateUserStatus(draft.status, language),
      ];
    });

    const tableRows = [
      [labels.number, labels.name, labels.email, labels.login, labels.role, "Должность", "Отдел", "Статус"],
      ...rows,
    ]
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${escapeExcelCell(cell)}</td>`).join("")}</tr>`
      )
      .join("");

    const html = `\uFEFF<table>${tableRows}</table>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "users.xls";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-stack">
      <section className="admin-panel">
        <div className="admin-panel__title">
          <span className="admin-panel__icon" aria-hidden="true" />
          <h1>{labels.adminPanel}</h1>
        </div>

        <div className="admin-toolbar">
          <label className="admin-search">
            <span aria-hidden="true" />
            <input
              value={adminSearch}
              placeholder={labels.searchPlaceholder}
              onChange={(event) => setAdminSearch(event.target.value)}
            />
          </label>

          <div className="admin-toolbar__actions">
            <button className="excel-button" onClick={exportUsers}>
              {labels.exportExcel}
            </button>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {feedback.text ? (
          <p className={`form-alert form-alert--${feedback.type}`}>{feedback.text}</p>
        ) : null}

        {user.roleCode !== "ADMIN" ? <p className="muted-text">{labels.onlyAdmin}</p> : null}

        {selectedUserId ? (
          <div className="admin-filter">
            <span>{filteredUsers.length ? labels.searchFilter : labels.userNotFound}</span>
            <button className="ghost-button" onClick={() => setSearchParams({})}>
              {labels.showAll}
            </button>
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{labels.number}</th>
                <th>{labels.name}</th>
                <th>{labels.email}</th>
                <th>{labels.role}</th>
                <th>{labels.teacher}</th>
                <th>{labels.password}</th>
                <th>{labels.actions}</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.map((item, index) => {
                const draft = drafts[item.id] || buildUserDraft(item);
                const isSelf = item.id === user.id;
                const canEdit = user.roleCode === "ADMIN";

                return (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="admin-name-cell">
                        <input
                          value={draft.fullName}
                          disabled={!canEdit}
                          onChange={(event) => updateDraft(item.id, "fullName", event.target.value)}
                        />
                        <span>{draft.position || getRoleLabel(draft.roleCode, language)}</span>
                      </div>
                    </td>
                    <td>
                      <input
                        type="email"
                        value={draft.email}
                        disabled={!canEdit}
                        onChange={(event) => updateDraft(item.id, "email", event.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={draft.roleCode}
                        disabled={!canEdit}
                        onChange={(event) => updateDraft(item.id, "roleCode", event.target.value)}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {getRoleLabel(role, language)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label className="teacher-check">
                        <input
                          type="checkbox"
                          checked={draft.roleCode === "TEACHER"}
                          disabled={!canEdit}
                          onChange={(event) => updateTeacherRole(item.id, event.target.checked)}
                        />
                      </label>
                    </td>
                    <td>
                      <div className="admin-password-cell">
                        <input
                          type={visiblePasswords[item.id] ? "text" : "password"}
                          value={draft.password}
                          placeholder={labels.passwordPlaceholder}
                          disabled={!canEdit}
                          onChange={(event) => updateDraft(item.id, "password", event.target.value)}
                        />
                        <button
                          className="icon-button"
                          type="button"
                          disabled={!canEdit}
                          title={visiblePasswords[item.id] ? labels.hidePassword : labels.showPassword}
                          onClick={() => togglePassword(item.id)}
                        >
                          {visiblePasswords[item.id] ? "Hide" : "Show"}
                        </button>
                      </div>
                    </td>
                    <td>
                      {canEdit ? (
                        <div className="admin-actions-cell">
                          <button className="save-button" onClick={() => saveUser(item.id)}>
                            {labels.save}
                          </button>
                          <button className="generate-button" onClick={() => fillGeneratedPassword(item.id)}>
                            {labels.generate}
                          </button>
                          <button
                            className="delete-button"
                            disabled={isSelf}
                            onClick={() => deleteUser(item)}
                          >
                            {labels.delete}
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}

              {!displayedUsers.length ? (
                <tr>
                  <td colSpan="7">
                    <p className="admin-empty">{labels.noUsers}</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
