import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { translateDepartment, translateRole, translateUserStatus } from "../../utils/localization";

export function UsersPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    status: "",
    roleCode: "",
    departmentId: "",
    query: "",
  });
  const labels =
    language === "ru"
      ? {
          found: "Найдено",
          status: "Статус",
          role: "Роль",
          department: "Подразделение",
          search: "Поиск",
          allStatuses: "Все статусы",
          allRoles: "Все роли",
          allDepartments: "Все подразделения",
          searchPlaceholder: "ФИО, email, логин, должность",
          reset: "Сбросить",
          active: "Активные",
          pending: "Ожидают подтверждения",
          blocked: "Заблокированные",
          reject: "Отклонить",
          rejectReason: "Причина отклонения",
          confirmReject: "Отклонить регистрацию",
        }
      : {
          found: "Табылды",
          status: "Абалы",
          role: "Ролу",
          department: "Бөлүм",
          search: "Издөө",
          allStatuses: "Бардык абалдар",
          allRoles: "Бардык ролдор",
          allDepartments: "Бардык бөлүмдөр",
          searchPlaceholder: "ФИО, email, логин, кызмат",
          reset: "Тазалоо",
          active: "Активдүү",
          pending: "Тастыктоону күтөт",
          blocked: "Бөгөттөлгөн",
          reject: "Четке кагуу",
          rejectReason: "Четке кагуу себеби",
          confirmReject: "Катталууну четке кагуу",
        };

  useEffect(() => {
    loadUsers();
  }, [filters.status, filters.roleCode, filters.departmentId, filters.query]);

  async function loadUsers() {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.roleCode) params.set("roleCode", filters.roleCode);
    if (filters.departmentId) params.set("departmentId", filters.departmentId);
    if (filters.query.trim()) params.set("q", filters.query.trim());

    const usersUrl = params.toString() ? `/api/users?${params.toString()}` : "/api/users";
    const [data, catalogs] = await Promise.all([api.get(usersUrl), api.get("/api/meta/catalogs")]);
    setUsers(data.users);
    setRoles(catalogs.roles || []);
    setDepartments(catalogs.departments || []);
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters({
      status: "",
      roleCode: "",
      departmentId: "",
      query: "",
    });
  }

  async function approveUser(id) {
    await api.post(`/api/users/${id}/approve`, {});
    loadUsers();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  async function rejectUser(item) {
    const reason = window.prompt(`${labels.confirmReject}: ${item.fullName}\n${labels.rejectReason}`, "");
    if (reason === null) {
      return;
    }

    await api.post(`/api/users/${item.id}/reject`, { reason });
    loadUsers();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel__header">
          <h3>{t("users.title")}</h3>
          <span className="tag">
            {labels.found}: {users.length}
          </span>
        </div>

        <div className="user-filters">
          <label>
            {labels.status}
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">{labels.allStatuses}</option>
              <option value="active">{labels.active}</option>
              <option value="pending">{labels.pending}</option>
              <option value="blocked">{labels.blocked}</option>
            </select>
          </label>

          <label>
            {labels.role}
            <select value={filters.roleCode} onChange={(event) => updateFilter("roleCode", event.target.value)}>
              <option value="">{labels.allRoles}</option>
              {roles.map((role) => (
                <option key={role.code} value={role.code}>
                  {translateRole(role.code, language)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {labels.department}
            <select
              value={filters.departmentId}
              onChange={(event) => updateFilter("departmentId", event.target.value)}
            >
              <option value="">{labels.allDepartments}</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {translateDepartment(department.id, language)}
                </option>
              ))}
            </select>
          </label>

          <label className="user-filters__search">
            {labels.search}
            <input
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder={labels.searchPlaceholder}
            />
          </label>

          <div className="user-filters__actions">
            <button className="ghost-button" type="button" onClick={resetFilters}>
              {labels.reset}
            </button>
          </div>
        </div>

        {users.length ? (
          users.map((item) => (
            <div className="user-row" key={item.id}>
              <div>
                <strong>{item.fullName}</strong>
                <p>
                  {translateRole(item.roleCode || item.roleTitle, language)} ·{" "}
                  {translateDepartment(item.departmentId || item.departmentTitle, language)}
                </p>
              </div>
              <div className="inline-actions">
                <span className={`tag ${item.status === "active" ? "tag--green" : "tag--orange"}`}>
                  {translateUserStatus(item.status, language)}
                </span>
                {item.status === "pending" && ["ADMIN", "DIRECTOR"].includes(user.roleCode) ? (
                  <>
                    <button className="ghost-button" onClick={() => approveUser(item.id)}>
                      {t("users.approve")}
                    </button>
                    <button className="danger-button" onClick={() => rejectUser(item)}>
                      {labels.reject}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <EmptyState title={t("users.noUsers")} text={t("users.noUsersText")} />
        )}
      </section>
    </div>
  );
}
