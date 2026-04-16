import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { translateRole } from "../../utils/localization";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";

function NavIcon({ name }) {
  const icons = {
    home: (
      <>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V20h13v-9.5" />
        <path d="M9.5 20v-6h5v6" />
      </>
    ),
    messages: (
      <>
        <path d="M4 5h16v11H8l-4 4V5Z" />
        <path d="M8 9h8" />
        <path d="M8 12.5h5" />
      </>
    ),
    requests: (
      <>
        <path d="M7 3h8l4 4v14H7V3Z" />
        <path d="M15 3v5h4" />
        <path d="M10 12h6" />
        <path d="M10 16h6" />
      </>
    ),
    documents: (
      <>
        <path d="M6 4h12v16H6V4Z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </>
    ),
    notifications: (
      <>
        <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
        <path d="M10 21h4" />
      </>
    ),
    profile: (
      <>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    users: (
      <>
        <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M17 10a3 3 0 1 0 0-6" />
        <path d="M18 20h3.5a5 5 0 0 0-5-5" />
      </>
    ),
    reports: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V8" />
        <path d="M16 16v-3" />
      </>
    ),
    admin: (
      <>
        <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
        <path d="M9.5 12 11 13.5 15 9.5" />
      </>
    ),
  };

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      {icons[name] || icons.home}
    </svg>
  );
}

const links = [
  { to: "/", labelKey: "nav.home", icon: "home" },
  { to: "/messages", labelKey: "nav.messages", icon: "messages" },
  { to: "/requests", labelKey: "nav.requests", icon: "requests" },
  { to: "/documents", labelKey: "nav.documents", icon: "documents" },
  { to: "/notifications", labelKey: "nav.notifications", icon: "notifications" },
  { to: "/profile", labelKey: "nav.profile", icon: "profile" },
  { to: "/users", labelKey: "nav.users", icon: "users", roles: ["ADMIN", "DIRECTOR", "HR"] },
  { to: "/reports", labelKey: "nav.reports", icon: "reports", roles: ["ADMIN", "DIRECTOR", "HR", "ACCOUNTANT"] },
  { to: "/admin", labelKey: "nav.admin", icon: "admin", roles: ["ADMIN", "DIRECTOR"] },
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
  const shellLabels =
    language === "ru"
      ? {
          search: "Поиск документов, заявлений и сообщений",
          notifications: "Уведомления",
        }
      : {
          search: "Документ, арыз жана билдирүү издөө",
          notifications: "Билдирүүлөр",
        };

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
              <span className="nav-link__label">
                <NavIcon name={item.icon} />
                {t(item.labelKey)}
              </span>
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
          <div className="topbar__search">
            <input aria-label={shellLabels.search} placeholder={shellLabels.search} />
          </div>
          <div className="topbar__actions">
            <span className="topbar__chip">
              {shellLabels.notifications}: {badges.unreadNotifications}
            </span>
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
