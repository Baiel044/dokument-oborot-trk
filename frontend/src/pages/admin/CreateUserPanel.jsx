import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, UserPlus, X } from "lucide-react";
import { api } from "../../services/api";
import { translateDepartment, translateRole, translateUserStatus } from "../../utils/localization";

const roleOptions = ["TEACHER", "ACADEMIC_OFFICE", "HR", "ACCOUNTANT", "DIRECTOR", "ADMIN"];
const departmentOptions = ["teaching", "academic-office", "hr", "accounting", "general", "it"];
const statusOptions = ["active", "pending", "blocked"];
const defaultDepartmentByRole = {
  TEACHER: "teaching",
  ACADEMIC_OFFICE: "academic-office",
  HR: "hr",
  ACCOUNTANT: "accounting",
  DIRECTOR: "general",
  ADMIN: "it",
};

const emptyForm = {
  fullName: "",
  username: "",
  email: "",
  password: "",
  phone: "",
  position: "",
  roleCode: "TEACHER",
  departmentId: "teaching",
  status: "active",
};

const copyByLanguage = {
  ru: {
    title: "Новый пользователь",
    subtitle: "Аккаунт создаётся сразу активным — подтверждение не требуется.",
    fullName: "ФИО",
    username: "Логин",
    usernameHint: "Латиница, цифры, точка, _ или -",
    email: "Email",
    password: "Пароль",
    passwordHint: "Не менее 8 символов",
    generate: "Сгенерировать",
    phone: "Телефон",
    position: "Должность",
    role: "Роль",
    department: "Подразделение",
    status: "Статус",
    create: "Создать пользователя",
    creating: "Создание...",
    cancel: "Отмена",
    created: "Пользователь создан. Передайте сотруднику данные для входа:",
    login: "Логин",
    copy: "Скопировать",
    copied: "Скопировано",
    site: "Сайт",
    another: "Создать ещё",
    adminWarning: "Роль «Администратор» даёт полный доступ к системе.",
  },
  ky: {
    title: "Жаңы колдонуучу",
    subtitle: "Аккаунт дароо активдүү түзүлөт — тастыктоонун кереги жок.",
    fullName: "Аты-жөнү",
    username: "Логин",
    usernameHint: "Латын тамгалары, сандар, чекит, _ же -",
    email: "Email",
    password: "Сырсөз",
    passwordHint: "Кеминде 8 белги",
    generate: "Түзүп берүү",
    phone: "Телефон",
    position: "Кызматы",
    role: "Ролу",
    department: "Бөлүм",
    status: "Абалы",
    create: "Колдонуучуну түзүү",
    creating: "Түзүлүүдө...",
    cancel: "Жокко чыгаруу",
    created: "Колдонуучу түзүлдү. Кызматкерге кирүү маалыматын бериңиз:",
    login: "Логин",
    copy: "Көчүрүү",
    copied: "Көчүрүлдү",
    site: "Сайт",
    another: "Дагы түзүү",
    adminWarning: "«Администратор» ролу системага толук жеткиликтүүлүк берет.",
  },
};

function generatePassword(length = 12) {
  // Unambiguous characters only, so the password can be dictated or written down.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

export function CreateUserPanel({ language, onCreated, onClose }) {
  const copy = copyByLanguage[language] || copyByLanguage.ky;
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  function update(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "roleCode" && defaultDepartmentByRole[value]) {
        next.departmentId = defaultDepartmentByRole[value];
      }
      return next;
    });
  }

  function bind(field) {
    return {
      className: "input",
      value: form[field],
      onChange: (event) => update(field, event.target.value),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = await api.post("/api/users", form);
      setCreated({ fullName: data.user.fullName, username: form.username, password: form.password });
      setCopied(false);
      onCreated?.(data.user);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function copyCredentials() {
    const text = `${copy.site}: ${window.location.origin}\n${copy.login}: ${created.username}\n${copy.password}: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (_error) {
      setCopied(false);
    }
  }

  function startAnother() {
    setCreated(null);
    setForm(emptyForm);
    setShowPassword(false);
  }

  return (
    <section className="create-user-panel animate-in">
      <div className="create-user-panel__header">
        <span className="create-user-panel__icon" aria-hidden="true">
          <UserPlus size={20} />
        </span>
        <div>
          <h3>{copy.title}</h3>
          <p>{copy.subtitle}</p>
        </div>
        <button className="icon-button" type="button" aria-label={copy.cancel} onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {created ? (
        <div className="create-user-result">
          <p className="alert alert-success">
            <Check size={18} aria-hidden="true" />
            <span>
              <strong>{created.fullName}</strong> — {copy.created}
            </span>
          </p>
          <dl className="create-user-credentials">
            <div>
              <dt>{copy.site}</dt>
              <dd>{window.location.origin}</dd>
            </div>
            <div>
              <dt>{copy.login}</dt>
              <dd>{created.username}</dd>
            </div>
            <div>
              <dt>{copy.password}</dt>
              <dd>{created.password}</dd>
            </div>
          </dl>
          <div className="inline-actions">
            <button className="btn btn-secondary" type="button" onClick={copyCredentials}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? copy.copied : copy.copy}
            </button>
            <button className="btn btn-primary" type="button" onClick={startAnother}>
              <UserPlus size={16} />
              {copy.another}
            </button>
          </div>
        </div>
      ) : (
        <form className="create-user-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field form-grid-full">
              <span className="field-label">{copy.fullName} *</span>
              <input autoFocus required {...bind("fullName")} />
            </label>
            <label className="field">
              <span className="field-label">{copy.username} *</span>
              <input required autoComplete="off" pattern="[a-zA-Z0-9._\-]{3,40}" {...bind("username")} />
              <span className="field-hint">{copy.usernameHint}</span>
            </label>
            <label className="field">
              <span className="field-label">{copy.email} *</span>
              <input required type="email" autoComplete="off" {...bind("email")} />
            </label>
            <label className="field form-grid-full">
              <span className="field-label">{copy.password} *</span>
              <span className="create-user-password">
                <span className="input-with-icon">
                  <KeyRound size={18} aria-hidden="true" />
                  <input
                    required
                    minLength={8}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    {...bind("password")}
                    className="input input-with-action"
                  />
                  <button
                    className="input-action"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={copy.password}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    update("password", generatePassword());
                    setShowPassword(true);
                  }}
                >
                  {copy.generate}
                </button>
              </span>
              <span className="field-hint">{copy.passwordHint}</span>
            </label>
            <label className="field">
              <span className="field-label">{copy.role} *</span>
              <select {...bind("roleCode")} className="select">
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {translateRole(role, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">{copy.department} *</span>
              <select {...bind("departmentId")} className="select">
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {translateDepartment(department, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">{copy.phone}</span>
              <input type="tel" {...bind("phone")} />
            </label>
            <label className="field">
              <span className="field-label">{copy.position}</span>
              <input {...bind("position")} />
            </label>
            <label className="field">
              <span className="field-label">{copy.status}</span>
              <select {...bind("status")} className="select">
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {translateUserStatus(status, language)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {form.roleCode === "ADMIN" ? <p className="form-alert form-alert--info">{copy.adminWarning}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <div className="inline-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <UserPlus size={16} />}
              {saving ? copy.creating : copy.create}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>
              {copy.cancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
