import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { AuthLayout } from "../../components/layout/AuthLayout";
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

const selfRegistrationRoleCodes = ["TEACHER", "ACADEMIC_OFFICE", "HR", "ACCOUNTANT"];

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

  const registrationRoles = catalogs.roles.filter((role) => selfRegistrationRoleCodes.includes(role.code));
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


  function bind(field) {
    return {
      className: "input",
      value: form[field],
      onChange: (event) => setForm({ ...form, [field]: event.target.value }),
    };
  }

  return (
    <AuthLayout wide>
      <div className="auth-heading">
        <span className="auth-eyebrow">{t("register.eyebrow")}</span>
        <h2>{t("register.formTitle")}</h2>
        <p>{t("register.description")}</p>
      </div>

      {message ? (
        <div className="alert alert-success">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{message}</span>
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field form-grid-full">
            <span className="field-label">{t("register.fullName")}</span>
            <input autoComplete="name" {...bind("fullName")} />
          </label>
          <label className="field">
            <span className="field-label">{t("register.email")}</span>
            <input type="email" autoComplete="email" {...bind("email")} />
          </label>
          <label className="field">
            <span className="field-label">{t("register.phone")}</span>
            <input type="tel" autoComplete="tel" {...bind("phone")} />
          </label>
          <label className="field">
            <span className="field-label">{t("register.position")}</span>
            <input {...bind("position")} />
          </label>
          <label className="field">
            <span className="field-label">{t("register.department")}</span>
            <select {...bind("departmentId")} className="select">
              <option value="">{t("common.chooseDepartment")}</option>
              {catalogs.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {translateDepartment(department.id || department.title, language)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t("register.role")}</span>
            <select {...bind("roleCode")} className="select">
              {registrationRoles.map((role) => (
                <option key={role.code} value={role.code}>
                  {translateRole(role.code || role.title, language)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t("register.username")}</span>
            <input autoComplete="username" {...bind("username")} />
          </label>
          <label className="field">
            <span className="field-label">{t("register.password")}</span>
            <input type="password" autoComplete="new-password" {...bind("password")} />
          </label>
          <label className="field">
            <span className="field-label">{t("register.confirmPassword")}</span>
            <input type="password" autoComplete="new-password" {...bind("confirmPassword")} />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="btn btn-primary btn-lg btn-block" disabled={loading} type="submit">
          {loading ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          {loading ? t("register.submitting") : t("register.submit")}
        </button>
      </form>

      <p className="auth-switch">
        {t("register.alreadyRegistered")} <Link to="/login">{t("common.backToLogin")}</Link>
      </p>
    </AuthLayout>
  );
}
