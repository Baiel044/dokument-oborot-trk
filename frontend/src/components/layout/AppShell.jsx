import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { translateRole } from "../../utils/localization";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";

const links = [
  { to: "/", labelKey: "nav.home" },
  { to: "/messages", labelKey: "nav.messages" },
  { to: "/requests", labelKey: "nav.requests" },
  { to: "/documents", labelKey: "nav.documents" },
  { to: "/notifications", labelKey: "nav.notifications" },
  { to: "/profile", labelKey: "nav.profile" },
  { to: "/users", labelKey: "nav.users", roles: ["ADMIN", "DIRECTOR", "HR"] },
  { to: "/reports", labelKey: "nav.reports", roles: ["ADMIN", "DIRECTOR", "HR", "ACCOUNTANT"] },
  { to: "/admin", labelKey: "nav.admin", roles: ["ADMIN", "DIRECTOR"] },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();
  const [badges, setBadges] = useState({
    unreadMessages: 0,
    unreadNotifications: 0,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadBadges() {
      try {
        const [messagesData, notificationsData] = await Promise.all([
          api.get("/api/messages?scope=inbox"),
          api.get("/api/notifications"),
        ]);

        if (isMounted) {
          setBadges({
            unreadMessages: messagesData.messages.filter((message) => !message.isRead).length,
            unreadNotifications: notificationsData.notifications.filter(
              (notification) => !notification.isRead
            ).length,
          });
        }
      } catch {
        if (isMounted) {
          setBadges({
            unreadMessages: 0,
            unreadNotifications: 0,
          });
        }
      }
    }

    loadBadges();

    const intervalId = window.setInterval(loadBadges, 5000);
    const handleRefresh = () => loadBadges();
    window.addEventListener("focus", handleRefresh);
    window.addEventListener("app:badges-refresh", handleRefresh);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("app:badges-refresh", handleRefresh);
    };
  }, []);

  const visibleLinks = useMemo(
    () => links.filter((item) => !item.roles || item.roles.includes(user.roleCode)),
    [user.roleCode]
  );

  const displayRoleTitle =
    translateRole(user.roleCode || user.roleTitle, language) || user.position || user.roleCode;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-block__top">
            <span className="brand-block__eyebrow">{t("brand.portal")}</span>
            <LanguageSwitcher compact />
          </div>
          <h1>{t("brand.college")}</h1>
          <p>{t("brand.description")}</p>
        </div>

        <nav className="sidebar__nav">
          {visibleLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link nav-link--active" : "nav-link")}
              end={item.to === "/"}
            >
              <span className="nav-link__label">{t(item.labelKey)}</span>
              {item.to === "/messages" && badges.unreadMessages > 0 ? (
                <span className="nav-link__badge">{badges.unreadMessages}</span>
              ) : null}
              {item.to === "/notifications" && badges.unreadNotifications > 0 ? (
                <span className="nav-link__badge">{badges.unreadNotifications}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div>
            <strong>{user.fullName}</strong>
            <p>{displayRoleTitle}</p>
          </div>
          <button className="ghost-button" onClick={logout}>
            {t("common.logout")}
          </button>
        </div>
      </aside>

      <main className="content-area">
        <header className="topbar">
          <div>
            <span className="topbar__label">{t("common.account")}</span>
            <h2>{displayRoleTitle}</h2>
          </div>
          <div className="topbar__actions">
            <Link className="primary-button" to="/requests">
              {t("common.createRequest")}
            </Link>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
