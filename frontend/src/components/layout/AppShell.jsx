import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api, buildAssetUrl, buildWebSocketUrl, getAuthToken } from "../../services/api";
import { translateRole } from "../../utils/localization";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import {
  BarChart3,
  Bell,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

const navIcons = {
  home: LayoutDashboard,
  messages: MessageSquare,
  requests: FileText,
  documents: FolderOpen,
  notifications: Bell,
  profile: UserRound,
  users: Users,
  reports: BarChart3,
  admin: ShieldCheck,
};

function NavIcon({ name, size = 18 }) {
  const Icon = navIcons[name] || LayoutDashboard;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}

const links = [
  { to: "/", labelKey: "nav.home", icon: "home", group: "main" },
  { to: "/messages", labelKey: "nav.messages", icon: "messages", group: "main" },
  { to: "/notifications", labelKey: "nav.notifications", icon: "notifications", group: "main" },
  { to: "/requests", labelKey: "nav.requests", icon: "requests", group: "workflow" },
  { to: "/documents", labelKey: "nav.documents", icon: "documents", group: "workflow" },
  { to: "/reports", labelKey: "nav.reports", icon: "reports", group: "manage", roles: ["ADMIN", "DIRECTOR", "ACADEMIC_OFFICE", "HR", "ACCOUNTANT"] },
  { to: "/users", labelKey: "nav.users", icon: "users", group: "manage", roles: ["ADMIN", "DIRECTOR", "HR"] },
  { to: "/admin", labelKey: "nav.admin", icon: "admin", group: "manage", roles: ["ADMIN", "DIRECTOR"] },
  { to: "/profile", labelKey: "nav.profile", icon: "profile", group: "manage" },
];

const navGroups = ["main", "workflow", "manage"];

const copyByLanguage = {
  ru: {
    brandTitle: "EduFlow TRK",
    brandDescription: "Электронный документооборот",
    search: "Поиск по системе...",
    searchLoading: "Поиск...",
    searchEmpty: "Ничего не найдено",
    notifications: "Уведомления",
    messages: "Сообщение",
    requests: "Заявление",
    documents: "Документ",
    users: "Пользователь",
    logout: "Выйти",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    fallbackUser: "Пользователь",
    groups: { main: "Главное", workflow: "Документооборот", manage: "Управление" },
    nav: {
      "nav.home": "Главная",
      "nav.messages": "Сообщения",
      "nav.requests": "Заявления",
      "nav.documents": "Документы",
      "nav.notifications": "Уведомления",
      "nav.profile": "Профиль",
      "nav.users": "Пользователи",
      "nav.reports": "Отчёты",
      "nav.admin": "Админ-панель",
    },
  },
  ky: {
    brandTitle: "EduFlow TRK",
    brandDescription: "Электрондук документ жүгүртүү",
    search: "Системадан издөө...",
    searchLoading: "Издөөдө...",
    searchEmpty: "Эч нерсе табылган жок",
    notifications: "Билдирүүлөр",
    messages: "Кабар",
    requests: "Арыз",
    documents: "Документ",
    users: "Колдонуучу",
    logout: "Чыгуу",
    openMenu: "Менюну ачуу",
    closeMenu: "Менюну жабуу",
    fallbackUser: "Колдонуучу",
    groups: { main: "Негизги", workflow: "Документ жүгүртүү", manage: "Башкаруу" },
    nav: {
      "nav.home": "Башкы бет",
      "nav.messages": "Кабарлар",
      "nav.requests": "Арыздар",
      "nav.documents": "Документтер",
      "nav.notifications": "Билдирүүлөр",
      "nav.profile": "Профиль",
      "nav.users": "Колдонуучулар",
      "nav.reports": "Отчёттор",
      "nav.admin": "Админ-панель",
    },
  },
};

function isUnreadableText(value) {
  const text = String(value || "").trim();
  const questionMarks = text.match(/\?/g) || [];
  const mojibakePairs = text.match(/[РС][\u0400-\u04ff]/g) || [];
  const readablePart = text.replace(/[?\s.,:;!"'()\-вЂ“вЂ”>В«В»/\\]+/g, "");
  return (questionMarks.length >= 3 && !readablePart) || mojibakePairs.length >= 3;
}

function readableText(value, fallback) {
  const text = String(value || "").trim();
  return text && !isUnreadableText(text) ? text : fallback;
}

function includesQuery(query, fields) {
  const normalizedQuery = query.trim().toLowerCase();
  return fields
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(normalizedQuery));
}

export function AppShell() {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const [badges, setBadges] = useState({
    unreadMessages: 0,
    unreadNotifications: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [brandLogoLoadFailed, setBrandLogoLoadFailed] = useState(false);
  const realtimeSocketRef = useRef(null);

  const shellCopy = copyByLanguage[language] || copyByLanguage.ky;

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

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      return undefined;
    }

    let socket;
    const connectTimer = window.setTimeout(() => {
      socket = new WebSocket(buildWebSocketUrl(`/api/messages/ws?token=${encodeURIComponent(token)}`));
      realtimeSocketRef.current = socket;

      socket.addEventListener("message", (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch (_error) {
          return;
        }

        if (payload.type === "notification:new" || payload.type === "chat:message") {
          window.dispatchEvent(new Event("app:badges-refresh"));
        }
      });

      socket.addEventListener("close", () => {
        if (realtimeSocketRef.current === socket) {
          realtimeSocketRef.current = null;
        }
      });
    }, 0);

    return () => {
      window.clearTimeout(connectTimer);
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close();
      }
      if (socket && realtimeSocketRef.current === socket) {
        realtimeSocketRef.current = null;
      }
    };
  }, [user.id]);

  const visibleLinks = useMemo(
    () => links.filter((item) => !item.roles || item.roles.includes(user.roleCode)),
    [user.roleCode]
  );

  const displayRoleTitle = translateRole(user.roleCode || user.roleTitle, language) || user.position || user.roleTitle || user.roleCode;
  const avatarSrc = avatarLoadFailed ? "" : buildAssetUrl(user.avatarPath);
  const displayUserName = readableText(user.fullName, "") || user.username || shellCopy.fallbackUser;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user.avatarPath]);

  useEffect(() => {
    const query = searchQuery.trim();
    let isCancelled = false;

    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return () => {
        isCancelled = true;
      };
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);

      const canSearchUsers = ["ADMIN", "DIRECTOR"].includes(user.roleCode);
      const requests = [
        api.get("/api/messages"),
        api.get("/api/requests"),
        api.get("/api/documents"),
      ];

      if (canSearchUsers) {
        requests.push(api.get("/api/users"));
      }

      const [messagesData, requestsData, documentsData, usersData] = await Promise.allSettled(requests);

      if (isCancelled) {
        return;
      }

      const messages =
        messagesData.status === "fulfilled"
          ? messagesData.value.messages
              .filter((item) =>
                includesQuery(query, [item.subject, item.text, item.senderName, item.receiverName])
              )
              .map((item) => ({
                id: `message-${item.id}`,
                type: shellCopy.messages,
                title: item.subject || shellCopy.messages,
                text: item.text,
                to: "/messages",
              }))
          : [];

      const foundRequests =
        requestsData.status === "fulfilled"
          ? requestsData.value.requests
              .filter((item) =>
                includesQuery(query, [
                  item.documentTitle,
                  item.type,
                  item.reason,
                  item.comment,
                  item.status,
                  item.authorName,
                ])
              )
              .map((item) => ({
                id: `request-${item.id}`,
                type: shellCopy.requests,
                title: item.documentTitle || item.type,
                text: item.reason || item.status,
                to: "/requests",
              }))
          : [];

      const documents =
        documentsData.status === "fulfilled"
          ? documentsData.value.documents
              .filter((item) =>
                includesQuery(query, [item.title, item.category, item.description, item.fileName])
              )
              .map((item) => ({
                id: `document-${item.id}`,
                type: shellCopy.documents,
                title: item.title || item.fileName,
                text: item.description || item.category,
                to: "/documents",
              }))
          : [];

      const foundUsers =
        usersData?.status === "fulfilled"
          ? usersData.value.users
              .filter((item) =>
                includesQuery(query, [
                  item.fullName,
                  item.username,
                  item.email,
                  item.phone,
                  item.position,
                  item.roleTitle,
                  item.departmentTitle,
                ])
              )
              .map((item) => ({
                id: `user-${item.id}`,
                type: shellCopy.users,
                title: item.fullName,
                text: item.username || item.email,
                to: `/admin?user=${encodeURIComponent(item.id)}`,
              }))
          : [];

      setSearchResults([...messages, ...foundRequests, ...documents, ...foundUsers].slice(0, 10));
      setIsSearching(false);
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    language,
    searchQuery,
    shellCopy.documents,
    shellCopy.messages,
    shellCopy.requests,
    shellCopy.users,
    user.roleCode,
  ]);

  function closeSearch() {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  }

  useEffect(() => {
    setIsSidebarOpen(false);
    closeSearch();
  }, [location.pathname]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
        closeSearch();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function renderBadge(path) {
    const count =
      path === "/messages" ? badges.unreadMessages : path === "/notifications" ? badges.unreadNotifications : 0;
    return count > 0 ? <span className="sidebar-link-badge">{count > 99 ? "99+" : count}</span> : null;
  }

  return (
    <div className="app-shell">
      {isSidebarOpen ? (
        <button
          className="sidebar-mobile-overlay"
          type="button"
          aria-label={shellCopy.closeMenu}
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}
      <aside className={isSidebarOpen ? "sidebar mobile-open" : "sidebar"}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">
            {brandLogoLoadFailed ? (
              "ТРК"
            ) : (
              <img src="/logo/college-logo.png" alt="" onError={() => setBrandLogoLoadFailed(true)} />
            )}
          </span>
          <span className="sidebar-brand-text">
            <span className="sidebar-brand-name">{shellCopy.brandTitle}</span>
            <span className="sidebar-brand-caption">{shellCopy.brandDescription}</span>
          </span>
          <button
            className="sidebar-close-btn"
            type="button"
            aria-label={shellCopy.closeMenu}
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group, index) => {
            const groupLinks = visibleLinks.filter((item) => item.group === group);
            if (!groupLinks.length) {
              return null;
            }

            return (
              <div className="sidebar-group" key={group}>
                {index > 0 ? <div className="sidebar-group-divider" /> : null}
                <span className="sidebar-group-label">{shellCopy.groups[group]}</span>
                {groupLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
                    end={item.to === "/"}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <NavIcon name={item.icon} />
                    <span className="sidebar-link-label">{shellCopy.nav[item.labelKey]}</span>
                    {renderBadge(item.to)}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link sidebar-logout" onClick={logout} type="button">
            <LogOut size={18} aria-hidden="true" />
            <span className="sidebar-link-label">{shellCopy.logout}</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="header">
          <button
            className="header-icon-btn header-mobile-toggle"
            type="button"
            aria-label={shellCopy.openMenu}
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen((current) => !current)}
          >
            <Menu size={20} />
          </button>
          <div className="header-search">
            <Search size={18} aria-hidden="true" />
            <input
              aria-label={shellCopy.search}
              placeholder={shellCopy.search}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
            />
            {searchQuery ? (
              <button className="header-search-clear" type="button" aria-label={shellCopy.closeMenu} onClick={closeSearch}>
                <X size={14} />
              </button>
            ) : null}
            {isSearchOpen && searchQuery.trim().length >= 2 ? (
              <div className="card header-search-results">
                {isSearching ? <p className="header-search-empty">{shellCopy.searchLoading}</p> : null}
                {!isSearching && searchResults.length === 0 ? (
                  <p className="header-search-empty">{shellCopy.searchEmpty}</p>
                ) : null}
                {!isSearching
                  ? searchResults.map((item) => (
                      <Link className="header-search-item" key={item.id} to={item.to} onClick={closeSearch}>
                        <span className="header-search-item-type">{item.type}</span>
                        <span className="header-search-item-name">{item.title}</span>
                        {item.text ? <span className="header-search-item-meta">{item.text}</span> : null}
                      </Link>
                    ))
                  : null}
              </div>
            ) : null}
          </div>
          <div className="spacer" />
          <div className="header-actions">
            <LanguageSwitcher compact />
            <Link className="header-icon-btn" to="/notifications" aria-label={shellCopy.notifications}>
              <Bell size={18} />
              {badges.unreadNotifications > 0 ? (
                <span className="header-icon-count">
                  {badges.unreadNotifications > 99 ? "99+" : badges.unreadNotifications}
                </span>
              ) : null}
            </Link>
            <Link className="header-profile" to="/profile">
              <span className="avatar">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" onError={() => setAvatarLoadFailed(true)} />
                ) : (
                  displayUserName.charAt(0)
                )}
              </span>
              <span className="header-profile-text">
                <span className="header-profile-name">{displayUserName}</span>
                <span className="header-profile-role">{displayRoleTitle}</span>
              </span>
            </Link>
          </div>
        </header>
        <main className="app-content route-transition" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
