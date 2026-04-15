import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { LanguageSwitcher } from "../../components/ui/LanguageSwitcher";

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
      <div className="auth-layout auth-layout--with-center-logo">
        <section className="auth-hero">
          <div className="auth-hero__top">
            <span className="auth-hero__eyebrow">{t("brand.portal")}</span>
          </div>

          <div className="auth-hero__bottom">
            <h1>{t("login.title")}</h1>
            <p>{t("login.description")}</p>

            <div className="auth-hero__actions">
              <button className="primary-button" type="button" onClick={() => setShowLoginForm(true)}>
                {t("login.signIn")}
              </button>
              <Link className="ghost-button" to="/register">
                {t("login.apply")}
              </Link>
            </div>

            <div className="auth-hero__stats">
              <div className="auth-hero__stat">
                <strong>{t("login.roles")}</strong>
                <span>{t("login.rolesText")}</span>
              </div>
              <div className="auth-hero__stat">
                <strong>{t("login.onlineRequests")}</strong>
                <span>{t("login.onlineRequestsText")}</span>
              </div>
              <div className="auth-hero__stat">
                <strong>{t("login.internalComms")}</strong>
                <span>{t("login.internalCommsText")}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="auth-layout__center-logo">
          <div className="logo-stage">
            <div className="logo-stage__glow" />
            <div className="college-logo" aria-hidden="true">
              <div className="college-logo__core">
                <img className="college-logo__image" src="/logo/college-logo.png" alt={t("login.logoAlt")} />
              </div>
            </div>
            <div className="logo-stage__footer">
              <p className="logo-stage__caption">{t("login.caption")}</p>
            </div>
          </div>
          <div className="auth-layout__center-language">
            <LanguageSwitcher compact />
          </div>
        </div>
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
              <p>`admin / admin123`, `director / director123`, `teacher / teacher123`</p>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
