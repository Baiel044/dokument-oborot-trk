import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, LogIn, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { AuthLayout } from "../../components/layout/AuthLayout";

const headingByLanguage = {
  ru: { title: "Вход в систему", subtitle: "Введите логин или email и пароль, чтобы продолжить." },
  ky: { title: "Системага кирүү", subtitle: "Улантуу үчүн логиниңизди же email жана сырсөздү жазыңыз." },
};

// Demo accounts are only offered in local development builds.
const showDemoAccounts = import.meta.env.DEV;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { language, t } = useLanguage();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const heading = headingByLanguage[language] || headingByLanguage.ky;

  const demoAccounts = [
    { label: t("login.admin"), username: "admin", password: "admin123" },
    { label: t("login.director"), username: "director", password: "director123" },
    { label: t("login.teacher"), username: "teacher", password: "teacher123" },
    { label: t("login.academic"), username: "academic", password: "academic123" },
    { label: t("login.hr"), username: "hr", password: "hr123456" },
    { label: t("login.accountant"), username: "accountant", password: "account123" },
  ];

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

  return (
    <AuthLayout>
      <div className="auth-heading">
        <h2>{heading.title}</h2>
        <p>{heading.subtitle}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">{t("login.loginOrEmail")}</span>
          <span className="input-with-icon">
            <UserRound size={18} aria-hidden="true" />
            <input
              className="input"
              autoFocus
              autoComplete="username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              placeholder={t("login.loginPlaceholder")}
            />
          </span>
        </label>
        <label className="field">
          <span className="field-label">{t("login.password")}</span>
          <span className="input-with-icon">
            <Lock size={18} aria-hidden="true" />
            <input
              className="input input-with-action"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder={t("login.passwordPlaceholder")}
            />
            <button
              className="input-action"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="btn btn-primary btn-lg btn-block" disabled={loading} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />}
          {loading ? t("login.loggingIn") : t("login.signIn")}
        </button>
      </form>

      <p className="auth-switch">
        {t("login.noAccount")} <Link to="/register">{t("login.registerLink")}</Link>
      </p>

      {showDemoAccounts ? (
        <div className="auth-demo">
          <span className="auth-demo-label">{t("login.demoAccounts")}</span>
          <div className="chip-list">
            {demoAccounts.map((account) => (
              <button
                key={account.username}
                className="chip chip-button"
                type="button"
                onClick={() => {
                  setForm({ username: account.username, password: account.password });
                  setError("");
                }}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </AuthLayout>
  );
}
