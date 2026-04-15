import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { translateRole, translateUserStatus } from "../../utils/localization";

export function ProfilePage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel__header">
          <h3>{t("profile.title")}</h3>
        </div>
        <div className="detail-grid">
          <div>
            <span>{t("profile.fullName")}</span>
            <strong>{user.fullName}</strong>
          </div>
          <div>
            <span>{t("profile.email")}</span>
            <strong>{user.email}</strong>
          </div>
          <div>
            <span>{t("profile.phone")}</span>
            <strong>{user.phone}</strong>
          </div>
          <div>
            <span>{t("profile.username")}</span>
            <strong>{user.username}</strong>
          </div>
          <div>
            <span>{t("profile.role")}</span>
            <strong>{translateRole(user.roleCode || user.roleTitle, language) || user.roleCode}</strong>
          </div>
          <div>
            <span>{t("profile.status")}</span>
            <strong>{translateUserStatus(user.status, language)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
