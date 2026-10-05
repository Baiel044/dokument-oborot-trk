import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { LanguageSwitcher } from "../../components/ui/LanguageSwitcher";

function AuthIcon({ name }) {
  const icons = {
    building: (
      <>
        <path d="M4 20h16" />
        <path d="M6 20V9l6-4 6 4v11" />
        <path d="M9 20v-7h6v7" />
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
      </>
    ),
    login: (
      <>
        <path d="M10 7V5h9v14h-9v-2" />
        <path d="M4 12h10" />
        <path d="m10 8 4 4-4 4" />
      </>
    ),
    request: (
      <>
        <path d="M6 3h8l4 4v14H6V3Z" />
        <path d="M14 3v5h4" />
        <path d="M9 13h5" />
        <path d="M9 17h3" />
        <path d="m15 18 4-4" />
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
    document: (
      <>
        <path d="M7 3h7l4 4v14H7V3Z" />
        <path d="M14 3v5h4" />
        <path d="M10 12h5" />
        <path d="M10 16h5" />
      </>
    ),
    chat: (
      <>
        <path d="M5 5h14v10H8l-3 3V5Z" />
        <path d="M9 9h6" />
        <path d="M9 12h4" />
      </>
    ),
  };

  return (
    <svg className="register-landing__icon" viewBox="0 0 24 24" aria-hidden="true">
      {icons[name] || icons.document}
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const loginInputRef = useRef(null);
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);

  const demoAccounts = [
    { label: t("login.admin"), username: "admin", password: "admin123" },
    { label: t("login.director"), username: "director", password: "director123" },
    { label: t("login.teacher"), username: "teacher", password: "teacher123" },
    { label: t("login.academic"), username: "academic", password: "academic123" },
    { label: t("login.hr"), username: "hr", password: "hr123456" },
    { label: t("login.accountant"), username: "accountant", password: "account123" },
  ];

  useEffect(() => {
    if (showLoginForm) {
      loginInputRef.current?.focus();
    }
  }, [showLoginForm]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate("/");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount(account) {
    setForm({
      username: account.username,
      password: account.password,
    });
    setError("");
  }

  return (
    <>
      <div className="register-landing">
        <section className="register-landing__hero">
          <div>
            <span className="register-landing__portal">
              <AuthIcon name="building" />
              {t("brand.portal")}
            </span>
          </div>

          <h1>{t("login.title")}</h1>
          <p>{t("login.description")}</p>

          <div className="register-landing__actions">
            <button className="primary-button" type="button" onClick={() => setShowLoginForm(true)}>
              <AuthIcon name="login" />
              {t("login.signIn")}
            </button>
            <Link className="ghost-button" to="/register">
              <AuthIcon name="request" />
              {t("login.apply")}
            </Link>
          </div>

          <div className="register-landing__features">
            <div>
              <span className="register-landing__feature-icon">
                <AuthIcon name="users" />
              </span>
              <strong>{t("login.roles")}</strong>
              <p>{t("login.rolesText")}</p>
            </div>
            <div>
              <span className="register-landing__feature-icon">
                <AuthIcon name="document" />
              </span>
              <strong>{t("login.onlineRequests")}</strong>
              <p>{t("login.onlineRequestsText")}</p>
            </div>
            <div>
              <span className="register-landing__feature-icon">
                <AuthIcon name="chat" />
              </span>
              <strong>{t("login.internalComms")}</strong>
              <p>{t("login.internalCommsText")}</p>
            </div>
          </div>
        </section>

        <section className="register-landing__right">
          <div className="register-landing__plate">
            <span className="register-landing__screw register-landing__screw--tl" />
            <span className="register-landing__screw register-landing__screw--tr" />
            <span className="register-landing__screw register-landing__screw--bl" />
            <span className="register-landing__screw register-landing__screw--br" />
            <img src="/logo/college-logo.png" alt={t("login.logoAlt")} />
            <div className="register-landing__plate-footer">
              <span />
              <strong>{t("login.caption")}</strong>
            </div>
          </div>
          <div className="register-landing__language">
            <LanguageSwitcher compact />
          </div>
        </section>
      </div>

      {showLoginForm ? (
        <div className="auth-modal" onClick={() => setShowLoginForm(false)}>
          <form
            className="auth-card auth-card--popup auth-card--modal"
            id="auth-form"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="auth-modal__close"
              type="button"
              aria-label={t("login.close")}
              onClick={() => {
                setShowLoginForm(false);
                setError("");
              }}
            >
              ×
            </button>
            <label>
              {t("login.loginOrEmail")}
              <input
                ref={loginInputRef}
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                placeholder={t("login.loginPlaceholder")}
              />
            </label>
            <label>
              {t("login.password")}
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder={t("login.passwordPlaceholder")}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <p className="auth-card__hint">{t("login.loginHelp")}</p>
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? t("login.loggingIn") : t("login.signIn")}
            </button>
            <p className="auth-card__footer">
              {t("login.noAccount")} <Link to="/register">{t("login.registerLink")}</Link>
            </p>
            <div className="demo-box">
              <strong>{t("login.demoAccounts")}</strong>
              <div className="demo-box__actions">
                {demoAccounts.map((account) => (
                  <button
                    key={account.label}
                    className="ghost-button"
                    type="button"
                    onClick={() => fillDemoAccount(account)}
                  >
                    {account.label}
                  </button>
                ))}
              </div>
              <p>
                {demoAccounts.map((account) => `\`${account.username} / ${account.password}\``).join(", ")}
              </p>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
