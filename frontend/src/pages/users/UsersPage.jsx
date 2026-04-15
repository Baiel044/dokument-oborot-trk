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

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const data = await api.get("/api/users");
    setUsers(data.users);
  }

  async function approveUser(id) {
    await api.post(`/api/users/${id}/approve`, {});
    loadUsers();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel__header">
          <h3>{t("users.title")}</h3>
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
                  <button className="ghost-button" onClick={() => approveUser(item.id)}>
                    {t("users.approve")}
                  </button>
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
