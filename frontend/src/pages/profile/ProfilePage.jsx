import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api, buildAssetUrl } from "../../services/api";
import { translateRole, translateUserStatus } from "../../utils/localization";

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const { language, t } = useLanguage();
  const labels =
    language === "ru"
      ? {
          edit: "Редактировать профиль",
          save: "Сохранить",
          cancel: "Отмена",
          position: "Должность",
          saved: "Профиль обновлён.",
          required: "ФИО и email обязательны.",
          securityTitle: "Безопасность аккаунта",
          passwordHint: "Смена пароля требует ввода текущего пароля.",
          currentPassword: "Текущий пароль",
          newPassword: "Новый пароль",
          confirmPassword: "Повторите новый пароль",
          changePassword: "Сменить пароль",
          passwordChanged: "Пароль обновлён.",
          passwordRequired: "Заполните текущий пароль и новый пароль.",
          passwordMismatch: "Новые пароли не совпадают.",
        }
      : {
          edit: "Профилди өзгөртүү",
          save: "Сактоо",
          cancel: "Жокко чыгаруу",
          position: "Кызматы",
          saved: "Профиль жаңыртылды.",
          required: "Аты-жөнү жана email милдеттүү.",
          securityTitle: "Аккаунт коопсуздугу",
          passwordHint: "Сырсөздү өзгөртүү үчүн учурдагы сырсөз керек.",
          currentPassword: "Учурдагы сырсөз",
          newPassword: "Жаңы сырсөз",
          confirmPassword: "Жаңы сырсөздү кайталаңыз",
          changePassword: "Сырсөздү өзгөртүү",
          passwordChanged: "Сырсөз жаңыртылды.",
          passwordRequired: "Учурдагы жана жаңы сырсөздү толтуруңуз.",
          passwordMismatch: "Жаңы сырсөздөр дал келбейт.",
        };

  const avatarLabels =
    language === "ru"
      ? {
          title: "Фото профиля",
          hint: "JPG, PNG или WEBP до 3 МБ.",
          choose: "Загрузить фото",
          uploading: "Загрузка...",
          updated: "Фото профиля обновлено.",
          invalidType: "Выберите изображение JPG, PNG или WEBP.",
        }
      : {
          title: "Профиль сүрөтү",
          hint: "JPG, PNG же WEBP, 3 МБ чейин.",
          choose: "Сүрөт жүктөө",
          uploading: "Жүктөлүүдө...",
          updated: "Профиль сүрөтү жаңыртылды.",
          invalidType: "JPG, PNG же WEBP сүрөтүн тандаңыз.",
        };

  const avatarInputRef = useRef(null);
  const avatarPreviewRef = useRef("");
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [passwordFeedback, setPasswordFeedback] = useState({ type: "", text: "" });
  const [avatarFeedback, setAvatarFeedback] = useState({ type: "", text: "" });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [draft, setDraft] = useState({
    fullName: user.fullName || "",
    email: user.email || "",
    phone: user.phone || "",
    position: user.position || "",
  });
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setDraft({
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      position: user.position || "",
    });
  }, [user]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user.avatar, user.avatarPath]);

  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current) {
        URL.revokeObjectURL(avatarPreviewRef.current);
      }
    };
  }, []);

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function setAvatarPreviewUrl(url) {
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current);
    }

    avatarPreviewRef.current = url;
    setAvatarPreview(url);
  }

  function updatePasswordDraft(field, value) {
    setPasswordDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setFeedback({ type: "", text: "" });

    if (!draft.fullName.trim() || !draft.email.trim()) {
      setFeedback({ type: "error", text: labels.required });
      return;
    }

    try {
      const data = await api.put(`/api/users/${user.id}`, {
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        position: draft.position.trim(),
      });
      setUser(data.user);
      setIsEditing(false);
      setFeedback({ type: "success", text: labels.saved });
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordFeedback({ type: "", text: "" });

    if (!passwordDraft.currentPassword || !passwordDraft.newPassword || !passwordDraft.confirmPassword) {
      setPasswordFeedback({ type: "error", text: labels.passwordRequired });
      return;
    }

    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setPasswordFeedback({ type: "error", text: labels.passwordMismatch });
      return;
    }

    try {
      await api.put("/api/users/me/password", passwordDraft);
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordFeedback({ type: "success", text: labels.passwordChanged });
    } catch (error) {
      setPasswordFeedback({ type: "error", text: error.message });
    }
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setAvatarFeedback({ type: "", text: "" });

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarFeedback({ type: "error", text: avatarLabels.invalidType });
      return;
    }

    setAvatarPreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setIsAvatarUploading(true);
      const data = await api.post("/api/users/me/avatar", formData);
      setUser(data.user);
      setAvatarPreviewUrl("");
      setAvatarLoadFailed(false);
      setAvatarFeedback({ type: "success", text: data.message || avatarLabels.updated });
    } catch (error) {
      setAvatarFeedback({ type: "error", text: error.message });
    } finally {
      setIsAvatarUploading(false);
    }
  }

  const savedAvatar = user.avatar || user.avatarPath || "";
  const avatarSrc = avatarPreview || (avatarLoadFailed ? "" : buildAssetUrl(savedAvatar));

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel__header">
          <h3>{t("profile.title")}</h3>
          {!isEditing ? (
            <button className="ghost-button" onClick={() => setIsEditing(true)}>
              {labels.edit}
            </button>
          ) : null}
        </div>
        {feedback.text ? <p className={`form-alert form-alert--${feedback.type}`}>{feedback.text}</p> : null}
        <div
          className="grid-form__full"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            marginBottom: "18px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "84px",
              height: "84px",
              borderRadius: "50%",
              overflow: "hidden",
              color: "#ffffff",
              background: "linear-gradient(135deg, #1f2a5c, #7557f6)",
              boxShadow: "0 16px 32px rgba(32, 43, 88, 0.18)",
              fontSize: "34px",
              fontWeight: 900,
              flex: "0 0 auto",
            }}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                onError={() => {
                  if (!avatarPreview) {
                    setAvatarLoadFailed(true);
                  }
                }}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <svg
                width="42"
                height="42"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            )}
          </span>
          <div style={{ display: "grid", gap: "10px", minWidth: 0 }}>
            <div>
              <strong>{avatarLabels.title}</strong>
              <p className="muted-text" style={{ margin: "4px 0 0" }}>
                {avatarLabels.hint}
              </p>
            </div>
            <div className="inline-actions">
              <button
                className="ghost-button"
                type="button"
                disabled={isAvatarUploading}
                onClick={() => avatarInputRef.current?.click()}
              >
                {isAvatarUploading ? avatarLabels.uploading : avatarLabels.choose}
              </button>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadAvatar}
              style={{ display: "none" }}
            />
          </div>
        </div>
        {avatarFeedback.text ? (
          <p className={`form-alert form-alert--${avatarFeedback.type}`}>{avatarFeedback.text}</p>
        ) : null}

        {isEditing ? (
          <form className="grid-form" onSubmit={saveProfile}>
            <label>
              {t("profile.fullName")}
              <input value={draft.fullName} onChange={(event) => updateDraft("fullName", event.target.value)} />
            </label>
            <label>
              {t("profile.email")}
              <input
                type="email"
                value={draft.email}
                onChange={(event) => updateDraft("email", event.target.value)}
              />
            </label>
            <label>
              {t("profile.phone")}
              <input value={draft.phone} onChange={(event) => updateDraft("phone", event.target.value)} />
            </label>
            <label>
              {labels.position}
              <input value={draft.position} onChange={(event) => updateDraft("position", event.target.value)} />
            </label>
            <div className="inline-actions grid-form__full">
              <button className="primary-button" type="submit">
                {labels.save}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFeedback({ type: "", text: "" });
                }}
              >
                {labels.cancel}
              </button>
            </div>
          </form>
        ) : (
          <div className="detail-grid">
            <div>
              <span>{t("profile.fullName")}</span>
              <strong>{user.fullName}</strong>
            </div>
            <div>
              <span>{t("profile.email")}</span>
              <strong>{user.email}</strong>
            </div>
            <div>
              <span>{t("profile.phone")}</span>
              <strong>{user.phone}</strong>
            </div>
            <div>
              <span>{t("profile.username")}</span>
              <strong>{user.username}</strong>
            </div>
            <div>
              <span>{labels.position}</span>
              <strong>{user.position || "—"}</strong>
            </div>
            <div>
              <span>{t("profile.role")}</span>
              <strong>{translateRole(user.roleCode || user.roleTitle, language) || user.roleCode}</strong>
            </div>
            <div>
              <span>{t("profile.status")}</span>
              <strong>{translateUserStatus(user.status, language)}</strong>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h3>{labels.securityTitle}</h3>
            <p className="muted-text">{labels.passwordHint}</p>
          </div>
        </div>
        {passwordFeedback.text ? (
          <p className={`form-alert form-alert--${passwordFeedback.type}`}>{passwordFeedback.text}</p>
        ) : null}
        <form className="grid-form" onSubmit={changePassword}>
          <label>
            {labels.currentPassword}
            <input
              type="password"
              value={passwordDraft.currentPassword}
              onChange={(event) => updatePasswordDraft("currentPassword", event.target.value)}
            />
          </label>
          <label>
            {labels.newPassword}
            <input
              type="password"
              value={passwordDraft.newPassword}
              onChange={(event) => updatePasswordDraft("newPassword", event.target.value)}
            />
          </label>
          <label>
            {labels.confirmPassword}
            <input
              type="password"
              value={passwordDraft.confirmPassword}
              onChange={(event) => updatePasswordDraft("confirmPassword", event.target.value)}
            />
          </label>
          <div className="inline-actions grid-form__full">
            <button className="primary-button" type="submit">
              {labels.changePassword}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
