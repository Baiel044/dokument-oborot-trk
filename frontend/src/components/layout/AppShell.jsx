import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api, buildAssetUrl, buildWebSocketUrl, getAuthToken } from "../../services/api";
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
  { to: "/reports", labelKey: "nav.reports", icon: "reports", roles: ["ADMIN", "DIRECTOR", "ACADEMIC_OFFICE", "HR", "ACCOUNTANT"] },
  { to: "/users", labelKey: "nav.users", icon: "users", roles: ["ADMIN", "DIRECTOR", "HR"] },
  { to: "/admin", labelKey: "nav.admin", icon: "admin", roles: ["ADMIN", "DIRECTOR"] },
];

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
    theme: "Светлая тема",
    logout: "Выйти",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    fallbackUser: "Пользователь",
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
    theme: "Жарык тема",
    logout: "Чыгуу",
    openMenu: "Менюну ачуу",
    closeMenu: "Менюну жабуу",
    fallbackUser: "Колдонуучу",
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
  const displayUserName = readableText(user.fullName, "Бактыбек уулу Байэл") || user.username || shellCopy.fallbackUser;

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

  return (
    <div className={isSidebarOpen ? "app-shell app-shell--menu-open" : "app-shell"}>
      <button
        className="sidebar-backdrop"
        type="button"
        aria-label={shellCopy.closeMenu}
        onClick={() => setIsSidebarOpen(false)}
      />
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-block__mark">
            {brandLogoLoadFailed ? (
              <span className="brand-block__fallback" aria-label={shellCopy.brandTitle}>
                ТРК
              </span>
            ) : (
              <img
                className="brand-block__logo"
                src="/logo/college-logo.png"
                alt={shellCopy.brandTitle}
                onError={() => setBrandLogoLoadFailed(true)}
              />
            )}
          </span>
          <span>
            <strong>{shellCopy.brandTitle}</strong>
            <small>{shellCopy.brandDescription}</small>
          </span>
        </div>

        <nav className="sidebar__nav">
          {visibleLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link nav-link--active" : "nav-link")}
              end={item.to === "/"}
              onClick={() => setIsSidebarOpen(false)}
            >
              <span className="nav-link__label">
                <NavIcon name={item.icon} />
                {shellCopy.nav[item.labelKey]}
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
          <button className="sidebar__logout" onClick={logout} type="button">
            {shellCopy.logout}
          </button>
        </div>
      </aside>

      <main className="content-area">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            type="button"
            aria-label={shellCopy.openMenu}
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="topbar__search">
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
            {isSearchOpen && searchQuery.trim().length >= 2 ? (
              <div className="search-popover">
                {isSearching ? <p className="search-popover__state">{shellCopy.searchLoading}</p> : null}
                {!isSearching && searchResults.length === 0 ? (
                  <p className="search-popover__state">{shellCopy.searchEmpty}</p>
                ) : null}
                {!isSearching
                  ? searchResults.map((item) => (
                      <Link
                        className="search-result"
                        key={item.id}
                        to={item.to}
                        onClick={closeSearch}
                      >
                        <span>{item.type}</span>
                        <strong>{item.title}</strong>
                        <p>{item.text}</p>
                      </Link>
                    ))
                  : null}
              </div>
            ) : null}
          </div>
          <div className="topbar__actions">
            <LanguageSwitcher compact />
            <Link className="topbar__notification" to="/notifications" aria-label={shellCopy.notifications}>
              <NavIcon name="notifications" />
              {badges.unreadNotifications > 0 ? <span>{badges.unreadNotifications}</span> : null}
            </Link>
            <Link className="topbar__user" to="/profile">
              <span className={avatarSrc ? "topbar__avatar topbar__avatar--image" : "topbar__avatar"}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" onError={() => setAvatarLoadFailed(true)} />
                ) : (
                  displayUserName.charAt(0)
                )}
              </span>
              <span>
                <strong>{displayUserName}</strong>
                <small>{displayRoleTitle}</small>
              </span>
            </Link>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
