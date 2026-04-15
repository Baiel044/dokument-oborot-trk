import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { getLocale, translateRequestStatus, translateRequestType, translateRole } from "../../utils/localization";

const DIRECTOR_REVIEW_STATUS = "Директор карап жатат";
const DRAFT_STATUS = "Долбоор";
const DEFAULT_ABSENCE_TIME = {
  ky: "Толук күн",
  ru: "Полный день",
};

function createInitialForm(language) {
  return {
    type: "",
    documentTitle: "",
    reason: "",
    comment: "",
    startDate: "",
    endDate: "",
    absenceTime: DEFAULT_ABSENCE_TIME[language] || DEFAULT_ABSENCE_TIME.ky,
    status: DIRECTOR_REVIEW_STATUS,
    attachment: null,
  };
}

export function RequestsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [form, setForm] = useState(() => createInitialForm(language));
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const directorRoutes = [
    { label: t("requests.routeHr"), status: "Кадрлар бөлүмүнө жөнөтүлдү", nextRoleCode: "HR" },
    { label: t("requests.routeAccounting"), status: "Бухгалтерияга жөнөтүлдү", nextRoleCode: "ACCOUNTANT" },
    { label: t("requests.routeBack"), status: "Окутуучуга кайтарылды", nextRoleCode: "TEACHER" },
  ];

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    setForm((current) => {
      if (!Object.values(DEFAULT_ABSENCE_TIME).includes(current.absenceTime)) {
        return current;
      }

      return {
        ...current,
        absenceTime: DEFAULT_ABSENCE_TIME[language] || DEFAULT_ABSENCE_TIME.ky,
      };
    });
  }, [language]);

  function validateRequestForm(values) {
    const errors = {};

    if (!values.type.trim()) {
      errors.type = t("requests.typeRequired");
    }

    if (!values.documentTitle.trim()) {
      errors.documentTitle = t("requests.documentTitleRequired");
    }

    if (!values.reason.trim()) {
      errors.reason = t("requests.reasonRequired");
    }

    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      errors.endDate = t("requests.invalidDates");
    }

    return errors;
  }

  async function loadPage() {
    const [requestsData, catalogs] = await Promise.all([api.get("/api/requests"), api.get("/api/meta/catalogs")]);
    setRequests(requestsData.requests);
    setRequestTypes(catalogs.requestTypes);
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationErrors = validateRequestForm(form);
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      setError(t("requests.fillRequired"));
      return;
    }

    try {
      const payload = new FormData();
      payload.append("type", form.type.trim());
      payload.append("documentTitle", form.documentTitle.trim());
      payload.append("reason", form.reason.trim());
      payload.append("comment", form.comment.trim());
      payload.append("startDate", form.startDate);
      payload.append("endDate", form.endDate);
      payload.append("absenceTime", form.absenceTime.trim());
      payload.append("status", form.status);

      if (form.attachment) {
        payload.append("attachment", form.attachment);
      }

      await api.post("/api/requests", payload);
      setForm(createInitialForm(language));
      setFieldErrors({});
      setSuccess(t("requests.success"));
      loadPage();
      window.dispatchEvent(new Event("app:badges-refresh"));
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function routeDocument(requestItem, route) {
    const directorComment = window.prompt(t("requests.directorPrompt"), requestItem.directorComment || "");
    if (directorComment === null) {
      return;
    }

    const signatureName = window.prompt(t("requests.signaturePrompt"), user.fullName) || user.fullName;

    await api.put(`/api/requests/${requestItem.id}/status`, {
      status: route.status,
      nextRoleCode: route.nextRoleCode,
      directorComment,
      signatureName,
    });

    loadPage();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  async function approveDocument(requestItem) {
    const directorComment = window.prompt(t("requests.directorPrompt"), requestItem.directorComment || "");
    if (directorComment === null) {
      return;
    }

    const signatureName = window.prompt(t("requests.signaturePrompt"), user.fullName) || user.fullName;

    await api.put(`/api/requests/${requestItem.id}/status`, {
      status: "Директор кол койду",
      nextRoleCode: "DIRECTOR",
      directorComment,
      signatureName,
    });

    loadPage();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  const canCreateAppeal = user.roleCode === "TEACHER";
  const canReview = ["DIRECTOR", "ADMIN"].includes(user.roleCode);

  const panelTitle = canReview
    ? t("requests.directorQueue")
    : user.roleCode === "HR"
      ? t("requests.hrQueue")
      : user.roleCode === "ACCOUNTANT"
        ? t("requests.accountantQueue")
        : t("requests.myQueue");

  return (
    <div className="page-stack">
      {canCreateAppeal ? (
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel__header">
            <h3>{t("requests.titleTeacher")}</h3>
          </div>

          <div className="grid-form">
            <label>
              {t("requests.type")}
              <select
                className={fieldErrors.type ? "input-error" : ""}
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
              >
                <option value="">{t("requests.chooseType")}</option>
                {requestTypes.map((type) => (
                  <option key={type} value={type}>
                    {translateRequestType(type, language)}
                  </option>
                ))}
              </select>
              {fieldErrors.type ? <span className="field-error-text">{fieldErrors.type}</span> : null}
            </label>

            <label>
              {t("requests.documentTitle")}
              <input
                className={fieldErrors.documentTitle ? "input-error" : ""}
                value={form.documentTitle}
                onChange={(event) => updateField("documentTitle", event.target.value)}
                placeholder={t("requests.documentTitlePlaceholder")}
              />
              {fieldErrors.documentTitle ? (
                <span className="field-error-text">{fieldErrors.documentTitle}</span>
              ) : null}
            </label>

            <label>
              {t("requests.startDate")}
              <input type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} />
            </label>

            <label>
              {t("requests.endDate")}
              <input
                className={fieldErrors.endDate ? "input-error" : ""}
                type="date"
                value={form.endDate}
                onChange={(event) => updateField("endDate", event.target.value)}
              />
              {fieldErrors.endDate ? <span className="field-error-text">{fieldErrors.endDate}</span> : null}
            </label>

            <label>
              {t("requests.absenceTime")}
              <input value={form.absenceTime} onChange={(event) => updateField("absenceTime", event.target.value)} />
            </label>

            <label>
              {t("requests.sendMode")}
              <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option value={DRAFT_STATUS}>{t("requests.draft")}</option>
                <option value={DIRECTOR_REVIEW_STATUS}>{t("requests.directToDirector")}</option>
              </select>
            </label>

            <label className="grid-form__full">
              {t("requests.reason")}
              <textarea
                className={fieldErrors.reason ? "input-error" : ""}
                value={form.reason}
                onChange={(event) => updateField("reason", event.target.value)}
                placeholder={t("requests.reasonPlaceholder")}
              />
              {fieldErrors.reason ? <span className="field-error-text">{fieldErrors.reason}</span> : null}
            </label>

            <label className="grid-form__full">
              {t("requests.comment")}
              <textarea
                value={form.comment}
                onChange={(event) => updateField("comment", event.target.value)}
                placeholder={t("requests.commentPlaceholder")}
              />
            </label>

            <label className="grid-form__full">
              {t("requests.attachment")}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(event) => updateField("attachment", event.target.files?.[0] || null)}
              />
            </label>
          </div>

          {success ? <p className="form-success">{success}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit">
            {t("requests.send")}
          </button>
        </form>
      ) : null}

      <section className="panel">
        <div className="panel__header">
          <h3>{panelTitle}</h3>
        </div>

        {requests.length ? (
          requests.map((item) => (
            <article className="request-row request-row--document" key={item.id}>
              <div className="request-row__content">
                <strong>{item.documentTitle || translateRequestType(item.type, language)}</strong>
                <p>
                  {item.authorName ? `${item.authorName} · ` : ""}
                  {item.reason}
                </p>
                {item.isOfficial ? <p className="request-official-label">{t("requests.officialBadge")}</p> : null}
                <p>
                  {t("requests.currentRecipient")}:{" "}
                  {translateRole(item.currentRecipientRole || item.currentRecipientTitle, language) ||
                    item.currentRecipientTitle}
                </p>
                {item.directorComment ? (
                  <p>
                    {t("requests.directorComment")}: {item.directorComment}
                  </p>
                ) : null}
                {item.directorSignature ? (
                  <p>
                    {t("requests.signedBy")}: {item.directorSignature.signedBy} ·{" "}
                    {new Date(item.directorSignature.signedAt).toLocaleString(getLocale(language))}
                  </p>
                ) : null}
                {item.attachment ? (
                  <a className="request-doc-link" href={item.attachment.filePath} target="_blank" rel="noreferrer">
                    {t("requests.openAttachment")}: {item.attachment.fileName}
                  </a>
                ) : null}
                {item.officialDocument ? (
                  <a className="request-doc-link" href={item.officialDocument.filePath} target="_blank" rel="noreferrer">
                    {t("requests.officialPdf")}: {item.officialDocument.originalTitle || item.officialDocument.fileName}
                  </a>
                ) : null}

                {item.routeHistory?.length ? (
                  <div className="request-history">
                    {item.routeHistory.map((step) => (
                      <div className="request-history__item" key={step.id}>
                        <strong>{translateRequestStatus(step.status, language)}</strong>
                        <span>
                          {step.actorName} →{" "}
                          {translateRole(step.targetRoleCode || step.targetRoleTitle, language) || step.targetRoleTitle}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="request-row__actions">
                {canReview && item.currentRecipientRole === "DIRECTOR" && !item.isOfficial ? (
                  <button className="primary-button" onClick={() => approveDocument(item)}>
                    {t("requests.approve")}
                  </button>
                ) : null}

                {(() => {
                  const statusKy = translateRequestStatus(item.status, "ky");
                  const isApprovedRoute = ["Кадрлар бөлүмүнө жөнөтүлдү", "Бухгалтерияга жөнөтүлдү"].includes(
                    statusKy
                  );

                  return (
                    <span className={`tag ${isApprovedRoute ? "tag--green" : "tag--orange"}`}>
                      {translateRequestStatus(item.status, language)}
                    </span>
                  );
                })()}

                {canReview && item.currentRecipientRole === "DIRECTOR" && item.isOfficial ? (
                  <div className="inline-actions">
                    {directorRoutes.map((route) => (
                      <button className="ghost-button" key={route.status} onClick={() => routeDocument(item, route)}>
                        {route.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <EmptyState title={t("requests.noDocuments")} text={t("requests.noDocumentsText")} />
        )}
      </section>
    </div>
  );
}
