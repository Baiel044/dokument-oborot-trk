import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { LanguageSwitcher } from "../../components/ui/LanguageSwitcher";
import { translateDepartment, translateRole } from "../../utils/localization";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  position: "",
  departmentId: "",
  roleCode: "TEACHER",
  username: "",
  password: "",
  confirmPassword: "",
};

export function RegisterPage() {
  const { register } = useAuth();
  const { language, t } = useLanguage();
  const [form, setForm] = useState(initialForm);
  const [catalogs, setCatalogs] = useState({ roles: [], departments: [] });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/api/meta/catalogs").then(setCatalogs).catch(() => null);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await register(form);
      setMessage(data.message);
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout auth-layout--register">
      <section className="auth-hero">
        <div className="auth-hero__top auth-hero__top--spread">
          <span className="auth-hero__eyebrow">{t("register.eyebrow")}</span>
          <LanguageSwitcher compact />
        </div>
        <h1>{t("register.title")}</h1>
        <p>{t("register.description")}</p>
      </section>

      <form className="auth-card auth-card--wide" onSubmit={handleSubmit}>
        <h2>{t("register.formTitle")}</h2>
        <div className="grid-form">
          <label>
            {t("register.fullName")}
            <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          </label>
          <label>
            {t("register.email")}
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            {t("register.phone")}
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <label>
            {t("register.position")}
            <input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
          </label>
          <label>
            {t("register.department")}
            <select
              value={form.departmentId}
              onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
            >
              <option value="">{t("common.chooseDepartment")}</option>
              {catalogs.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {translateDepartment(department.id || department.title, language)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("register.role")}
            <select value={form.roleCode} onChange={(event) => setForm({ ...form, roleCode: event.target.value })}>
              {catalogs.roles.map((role) => (
                <option key={role.code} value={role.code}>
                  {translateRole(role.code || role.title, language)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("register.username")}
            <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          </label>
          <label>
            {t("register.password")}
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <label>
            {t("register.confirmPassword")}
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            />
          </label>
        </div>

        {message ? <p className="form-success">{message}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? t("register.submitting") : t("register.submit")}
        </button>
        <p className="auth-card__footer">
          {t("register.alreadyRegistered")} <Link to="/login">{t("common.backToLogin")}</Link>
        </p>
      </form>
    </div>
  );
}
