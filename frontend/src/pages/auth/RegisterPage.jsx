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

const selfRegistrationRoleCodes = ["TEACHER", "ACADEMIC_OFFICE", "HR", "ACCOUNTANT"];

function RegisterIcon({ name }) {
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

export function RegisterPage() {
  const { register } = useAuth();
  const { language, t } = useLanguage();
  const [form, setForm] = useState(initialForm);
  const [catalogs, setCatalogs] = useState({ roles: [], departments: [] });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  useEffect(() => {
    api.get("/api/meta/catalogs").then(setCatalogs).catch(() => null);
  }, []);

  const registrationRoles = catalogs.roles.filter((role) => selfRegistrationRoleCodes.includes(role.code));
  const registerDesign =
    language === "ru"
      ? {
          portal: "Портал колледжа",
          college: "Таш-Кумырский региональный колледж",
          subtitle:
            "Внутренние сообщения, заявления директору, уведомления для учебной части, кадров и бухгалтерии в едином цифровом контуре.",
          roles: "6 ролей",
          rolesText: "Единый доступ по отделам",
          requests: "Онлайн-заявления",
          requestsText: "Согласование без бумаги",
          comms: "Внутренняя связь",
          commsText: "Сообщения и уведомления",
          system: "Официальная система электронного документооборота",
        }
      : {
          portal: "Колледж порталы",
          college: "Таш-Көмүр аймактык колледжи",
          subtitle:
            "Ички билдирүүлөр, директорго арыздар, окуу бөлүмү, кадрлар жана бухгалтерия үчүн билдирмелер бирдиктүү санариптик чөйрөдө.",
          roles: "6 роль",
          rolesText: "Бөлүмдөр боюнча бирдиктүү жеткиликтүүлүк",
          requests: "Онлайн арыздар",
          requestsText: "Кагазсыз макулдашуу",
          comms: "Ички байланыш",
          commsText: "Кабарлар жана билдирмелер",
          system: "Электрондук документ жүгүртүүнүн расмий системасы",
        };

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
    <div className="register-landing">
      <section className="register-landing__hero">
        <div>
          <span className="register-landing__portal">
            <RegisterIcon name="building" />
            {registerDesign.portal}
          </span>
        </div>
        <h1>{registerDesign.college}</h1>
        <p>{registerDesign.subtitle}</p>

        <div className="register-landing__actions">
          <Link className="primary-button" to="/login">
            <RegisterIcon name="login" />
            {t("login.signIn")}
          </Link>
          <button className="ghost-button" type="button" onClick={() => setShowRegisterForm(true)}>
            <RegisterIcon name="request" />
            {t("register.submit")}
          </button>
        </div>

        <div className="register-landing__features">
          <div>
            <span className="register-landing__feature-icon">
              <RegisterIcon name="users" />
            </span>
            <strong>{registerDesign.roles}</strong>
            <p>{registerDesign.rolesText}</p>
          </div>
          <div>
            <span className="register-landing__feature-icon">
              <RegisterIcon name="document" />
            </span>
            <strong>{registerDesign.requests}</strong>
            <p>{registerDesign.requestsText}</p>
          </div>
          <div>
            <span className="register-landing__feature-icon">
              <RegisterIcon name="chat" />
            </span>
            <strong>{registerDesign.comms}</strong>
            <p>{registerDesign.commsText}</p>
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
            <strong>{registerDesign.system}</strong>
          </div>
        </div>
        <div className="register-landing__language">
          <LanguageSwitcher compact />
        </div>
      </section>

      {showRegisterForm ? (
        <div className="auth-modal" onClick={() => setShowRegisterForm(false)}>
          <form
            className="auth-card auth-card--wide register-landing__form"
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="auth-modal__close"
              type="button"
              aria-label="Close"
              onClick={() => {
                setShowRegisterForm(false);
                setError("");
              }}
            >
              ×
            </button>
            <div>
              <span className="section-kicker">{t("register.eyebrow")}</span>
              <h2>{t("register.formTitle")}</h2>
              <p className="muted-text">{t("register.description")}</p>
            </div>
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
                  {registrationRoles.map((role) => (
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
      ) : null}
    </div>
  );
}
