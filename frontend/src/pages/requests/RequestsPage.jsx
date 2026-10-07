import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { getLocale, translateRequestStatus, translateRequestType, translateRole } from "../../utils/localization";

const DIRECTOR_REVIEW_STATUS = "Директор карап жатат";
const DRAFT_STATUS = "Долбоор";
const STATUS_TO_ACADEMIC_OFFICE = "Окуу бөлүмүнө жөнөтүлдү";
const STATUS_TO_HR = "Кадрлар бөлүмүнө жөнөтүлдү";
const STATUS_TO_ACCOUNTING = "Бухгалтерияга жөнөтүлдү";
const STATUS_RETURNED = "Окутуучуга кайтарылды";
const STATUS_REJECTED = "Четке кагылды";
const STATUS_COMPLETED = "Аткарылды";
const REQUEST_RECIPIENT_FILTERS = ["DIRECTOR", "ACADEMIC_OFFICE", "HR", "ACCOUNTANT", "TEACHER"];
const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
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

function createEditForm(requestItem) {
  return {
    type: requestItem.type || "",
    documentTitle: requestItem.documentTitle || "",
    reason: requestItem.reason || "",
    comment: requestItem.comment || "",
    startDate: requestItem.startDate || "",
    endDate: requestItem.endDate || "",
    absenceTime: requestItem.absenceTime || "",
    attachment: null,
  };
}

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

function readableStatus(status) {
  const text = String(status || "").toLowerCase();

  if (text.includes("ознаком") || text.includes("тааныш")) {
    return "Для ознакомления";
  }

  if (text.includes("к исполн") || text.includes("execution")) {
    return "К исполнению";
  }

  if (text.includes("кол кой") || text.includes("одоб") || text.includes("approved")) {
    return "Одобрено";
  }

  if (text.includes("кайтар") || text.includes("returned")) {
    return "Кайтарылды";
  }

  if (text.includes("четке") || text.includes("reject")) {
    return "Кайтарылды";
  }

  if (text.includes("исполн") || text.includes("аткар") || text.includes("complete")) {
    return "Исполнено";
  }

  if (text.includes("директор")) {
    return "Ожидание";
  }

  return "Ожидание";
}

function statusToneClass(status) {
  const label = readableStatus(status);
  if (label.includes("Р»РЅРµРЅРѕ") || label.includes("С‚РєР°СЂ")) return "tag--gray";
  if (label === "Одобрено" || label === "Исполнено") return "tag--green";
  if (label === "Для ознакомления" || label === "К исполнению") return "tag--blue";
  if (label === "Кайтарылды") return "tag--red";
  return "tag--orange";
}

function formatShortDate(value, language) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString(getLocale(language));
}

export function RequestsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const targetRequestId = searchParams.get("request") || "";
  const [requests, setRequests] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [requestStatuses, setRequestStatuses] = useState([]);
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    recipientRole: "",
    official: "",
    query: "",
    dateFrom: "",
    dateTo: "",
  });
  const [form, setForm] = useState(() => createInitialForm(language));
  const [editingRequestId, setEditingRequestId] = useState("");
  const [editForm, setEditForm] = useState(null);
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const filterLabels =
    language === "ru"
      ? {
          status: "Статус",
          type: "Тип заявления",
          recipient: "Текущий получатель",
          official: "Официальность",
          query: "Поиск",
          dateFrom: "С даты",
          dateTo: "По дату",
          allStatuses: "Все статусы",
          allTypes: "Все типы",
          allRecipients: "Все получатели",
          allDocuments: "Все документы",
          officialOnly: "Только официальные",
          notOfficial: "Без официального PDF",
          queryPlaceholder: "Название, автор, комментарий",
          reset: "Сбросить",
          found: "Найдено",
          editRequest: "Редактировать",
          editTitlePrompt: "Название документа",
          editReasonPrompt: "Суть обращения",
          editCommentPrompt: "Комментарий",
          editSuccess: "Заявление обновлено.",
          saveEdit: "Сохранить изменения",
          cancelEdit: "Отмена",
          replaceAttachment: "Заменить вложение",
          currentAttachment: "Текущее вложение",
          listTitle: "Заявления",
          createNew: "+ Создать заявление",
          tableNo: "№",
          tableTitle: "Тема",
          tableAuthor: "Автор",
          tableStatus: "Статус",
          tableDate: "Дата",
          tableRecipient: "Адрес",
          detailsCrumb: "Заявления / Детали",
          defaultTitle: "Заявление на отпуск",
          defaultReason: "Прошу предоставить отпуск с 20 мая 2026 года по 30 мая 2026 года по личным причинам.",
          author: "Автор:",
          role: "Роль:",
          date: "Дата:",
          recipientTo: "Кому:",
          teacher: "Преподаватель",
          routeTitle: "Маршрут документа",
          employee: "Сотрудник",
          attachedFiles: "Прикреплённые файлы",
          noFile: "Файл не прикреплён",
        }
      : {
          status: "Статус",
          type: "Кайрылуунун түрү",
          recipient: "Учурдагы алуучу",
          official: "Расмийлиги",
          query: "Издөө",
          dateFrom: "Баштапкы дата",
          dateTo: "Акыркы дата",
          allStatuses: "Бардык статустар",
          allTypes: "Бардык түрлөр",
          allRecipients: "Бардык алуучулар",
          allDocuments: "Бардык документтер",
          officialOnly: "Расмий документтер",
          notOfficial: "Расмий PDF жок",
          queryPlaceholder: "Аталышы, автор, комментарий",
          reset: "Тазалоо",
          found: "Табылды",
          editRequest: "Түзөтүү",
          editTitlePrompt: "Документтин аталышы",
          editReasonPrompt: "Кайрылуунун мазмуну",
          editCommentPrompt: "Комментарий",
          editSuccess: "Кайрылуу жаңыртылды.",
          saveEdit: "Өзгөртүүлөрдү сактоо",
          cancelEdit: "Жокко чыгаруу",
          replaceAttachment: "Тиркемени алмаштыруу",
          currentAttachment: "Учурдагы тиркеме",
          listTitle: "Арыздар",
          createNew: "+ Жаңы арыз түзүү",
          tableNo: "№",
          tableTitle: "Тема",
          tableAuthor: "Автор",
          tableStatus: "Статус",
          tableDate: "Дата",
          tableRecipient: "Дарек",
          detailsCrumb: "Арыздар / Деталдар",
          defaultTitle: "Өргүү боюнча арыз",
          defaultReason: "Мен 2026-жылдын 20-майынан 30-майына чейин жеке себептер менен жумушка чыкпай турганымды билдирем.",
          author: "Автор:",
          role: "Ролу:",
          date: "Дата:",
          recipientTo: "Кимге:",
          teacher: "Окутуучу",
          routeTitle: "Документтин маршруту",
          employee: "Кызматкер",
          attachedFiles: "Тиркелген файлдар",
          noFile: "Файл жок",
        };
  const detailLabels =
    language === "ru"
      ? {
          routeHistory: "История маршрута",
          date: "Дата",
          comment: "Комментарий",
          signature: "Подпись",
          signatureCode: "Код ЭЦП",
          noTarget: "Маршрут завершён",
        }
      : {
          routeHistory: "Маршрут тарыхы",
          date: "Дата",
          comment: "Комментарий",
          signature: "Кол тамга",
          signatureCode: "ЭЦП коду",
          noTarget: "Маршрут аяктады",
        };

  const routeActionLabels =
    language === "ru"
      ? {
          ACADEMIC_OFFICE: "В учебную часть",
          HR: "В кадры",
          ACCOUNTANT: "В бухгалтерию",
          TEACHER: "Вернуть",
        }
      : {
          ACADEMIC_OFFICE: "Окуу бөлүмүнө",
          HR: "Кадрларга",
          ACCOUNTANT: "Бухгалтерияга",
          TEACHER: "Кайтаруу",
        };

  const directorRoutes = [
    {
      label: t("requests.routeAcademic"),
      shortLabel: routeActionLabels.ACADEMIC_OFFICE,
      status: STATUS_TO_ACADEMIC_OFFICE,
      nextRoleCode: "ACADEMIC_OFFICE",
    },
    {
      label: t("requests.routeHr"),
      shortLabel: routeActionLabels.HR,
      status: STATUS_TO_HR,
      nextRoleCode: "HR",
    },
    {
      label: t("requests.routeAccounting"),
      shortLabel: routeActionLabels.ACCOUNTANT,
      status: STATUS_TO_ACCOUNTING,
      nextRoleCode: "ACCOUNTANT",
    },
    {
      label: t("requests.routeBack"),
      shortLabel: routeActionLabels.TEACHER,
      status: STATUS_RETURNED,
      nextRoleCode: "TEACHER",
    },
  ];

  useEffect(() => {
    loadPage();
  }, [
    filters.status,
    filters.type,
    filters.recipientRole,
    filters.official,
    filters.query,
    filters.dateFrom,
    filters.dateTo,
  ]);

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
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.type) params.set("type", filters.type);
    if (filters.recipientRole) params.set("recipientRole", filters.recipientRole);
    if (filters.official) params.set("official", filters.official);
    if (filters.query.trim()) params.set("q", filters.query.trim());
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);

    const requestsUrl = params.toString() ? `/api/requests?${params.toString()}` : "/api/requests";
    const [requestsData, catalogs] = await Promise.all([api.get(requestsUrl), api.get("/api/meta/catalogs")]);
    setRequests(requestsData.requests);
    setRequestTypes(catalogs.requestTypes);
    setRequestStatuses(catalogs.requestStatuses || []);
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

  function updateEditField(name, value) {
    setEditForm((current) => ({ ...current, [name]: value }));
    setEditFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters({
      status: "",
      type: "",
      recipientRole: "",
      official: "",
      query: "",
      dateFrom: "",
      dateTo: "",
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

  async function submitRequest(requestItem) {
    const comment = window.prompt(t("requests.resubmitPrompt"), requestItem.comment || "");
    if (comment === null) {
      return;
    }

    await api.put(`/api/requests/${requestItem.id}/submit`, { comment });
    loadPage();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  function startEditRequest(requestItem) {
    setError("");
    setSuccess("");
    setEditingRequestId(requestItem.id);
    setEditForm(createEditForm(requestItem));
    setEditFieldErrors({});
  }

  async function saveEditedRequest(event, requestItem) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationErrors = validateRequestForm(editForm);
    if (Object.keys(validationErrors).length) {
      setEditFieldErrors(validationErrors);
      setError(t("requests.fillRequired"));
      return;
    }

    try {
      const payload = new FormData();
      payload.append("type", editForm.type.trim());
      payload.append("documentTitle", editForm.documentTitle.trim());
      payload.append("reason", editForm.reason.trim());
      payload.append("comment", editForm.comment.trim());
      payload.append("startDate", editForm.startDate);
      payload.append("endDate", editForm.endDate);
      payload.append("absenceTime", editForm.absenceTime.trim());

      if (editForm.attachment) {
        payload.append("attachment", editForm.attachment);
      }

      await api.put(`/api/requests/${requestItem.id}`, payload);
      setEditingRequestId("");
      setEditForm(null);
      setEditFieldErrors({});
      setSuccess(filterLabels.editSuccess);
      loadPage();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function completeRequest(requestItem) {
    const comment = window.prompt(t("requests.completePrompt"), requestItem.completedComment || "");
    if (comment === null) {
      return;
    }

    await api.put(`/api/requests/${requestItem.id}/complete`, { comment });
    loadPage();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  async function returnBeforeSignature(requestItem) {
    const directorComment = window.prompt(t("requests.directorPrompt"), requestItem.directorComment || "");
    if (directorComment === null) {
      return;
    }

    await api.put(`/api/requests/${requestItem.id}/status`, {
      status: STATUS_RETURNED,
      nextRoleCode: "TEACHER",
      directorComment,
    });

    loadPage();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  async function rejectRequest(requestItem) {
    const directorComment = window.prompt(t("requests.rejectPrompt"), requestItem.directorComment || "");
    if (directorComment === null) {
      return;
    }

    await api.put(`/api/requests/${requestItem.id}/status`, {
      status: STATUS_REJECTED,
      directorComment,
    });

    loadPage();
    window.dispatchEvent(new Event("app:badges-refresh"));
  }

  async function openRequestFile(filePath) {
    setError("");

    try {
      await api.openFile(filePath);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function getRouteTarget(step) {
    return (
      translateRole(step.targetRoleCode || step.targetRoleTitle, language) ||
      step.targetRoleTitle ||
      detailLabels.noTarget
    );
  }

  const canCreateAppeal = user.roleCode === "TEACHER";
  const canReview = ["DIRECTOR", "ADMIN"].includes(user.roleCode);
  const canCompleteRequests = ["ACADEMIC_OFFICE", "HR", "ACCOUNTANT"].includes(user.roleCode);

  const panelTitle = canReview
    ? t("requests.directorQueue")
    : user.roleCode === "ACADEMIC_OFFICE"
      ? t("requests.academicQueue")
    : user.roleCode === "HR"
      ? t("requests.hrQueue")
      : user.roleCode === "ACCOUNTANT"
        ? t("requests.accountantQueue")
        : t("requests.myQueue");

  return (
    <div className="page-stack">
      {canCreateAppeal ? (
        <form className="panel" id="request-create-form" onSubmit={handleSubmit}>
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
                accept={DOCUMENT_ACCEPT}
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

      <section className="panel requests-list-panel">
        <div className="panel__header requests-list-panel__header">
          <h3>{filterLabels.listTitle}</h3>
          {canCreateAppeal ? (
            <button className="primary-button request-create-button" type="submit" form="request-create-form">
              {filterLabels.createNew}
            </button>
          ) : null}
          <span className="tag">
            {filterLabels.found}: {requests.length}
          </span>
        </div>

        <div className="request-filters">
          <label>
            {filterLabels.status}
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">{filterLabels.allStatuses}</option>
              {requestStatuses.map((status) => (
                <option key={status} value={status}>
                  {translateRequestStatus(status, language)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {filterLabels.type}
            <select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}>
              <option value="">{filterLabels.allTypes}</option>
              {requestTypes.map((type) => (
                <option key={type} value={type}>
                  {translateRequestType(type, language)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {filterLabels.recipient}
            <select
              value={filters.recipientRole}
              onChange={(event) => updateFilter("recipientRole", event.target.value)}
            >
              <option value="">{filterLabels.allRecipients}</option>
              {REQUEST_RECIPIENT_FILTERS.map((roleCode) => (
                <option key={roleCode} value={roleCode}>
                  {translateRole(roleCode, language)}
                </option>
              ))}
            </select>
          </label>

          <label>
            {filterLabels.official}
            <select value={filters.official} onChange={(event) => updateFilter("official", event.target.value)}>
              <option value="">{filterLabels.allDocuments}</option>
              <option value="true">{filterLabels.officialOnly}</option>
              <option value="false">{filterLabels.notOfficial}</option>
            </select>
          </label>

          <label className="request-filters__search">
            {filterLabels.query}
            <input
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder={filterLabels.queryPlaceholder}
            />
          </label>

          <label>
            {filterLabels.dateFrom}
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </label>

          <label>
            {filterLabels.dateTo}
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
            />
          </label>

          <div className="request-filters__actions">
            <button className="ghost-button" type="button" onClick={resetFilters}>
              {filterLabels.reset}
            </button>
          </div>
        </div>

        <div className="requests-table-head" aria-hidden="true">
          <span>{filterLabels.tableNo}</span>
          <span>{filterLabels.tableTitle}</span>
          <span>{filterLabels.tableAuthor}</span>
          <span>{filterLabels.tableStatus}</span>
          <span>{filterLabels.tableDate}</span>
          <span>{filterLabels.tableRecipient}</span>
          <span />
        </div>

        {requests.length ? (
          requests.map((item) => {
            const statusClass = statusToneClass(item.status);
            const currentRecipient =
              item.currentRecipientRole || item.currentRecipientTitle
                ? translateRole(item.currentRecipientRole || item.currentRecipientTitle, language) ||
                  item.currentRecipientTitle
                : t("requests.completedRecipient");
            const readableTitle = readableText(
              item.documentTitle || translateRequestType(item.type, language),
              filterLabels.defaultTitle
            );
            const readableAuthor = readableText(item.authorName, filterLabels.employee);
            const readableReason = readableText(
              item.reason,
              filterLabels.defaultReason
            );
            const requestFiles = [
              item.attachment
                ? {
                    label: item.attachment.fileName,
                    path: item.attachment.filePath,
                  }
                : null,
              item.officialDocument
                ? {
                    label: item.officialDocument.originalTitle || item.officialDocument.fileName,
                    path: item.officialDocument.filePath,
                  }
                : null,
            ].filter(Boolean);
            const showDirectorRoutes = canReview && item.currentRecipientRole === "DIRECTOR" && item.isOfficial;

            return (
              <article
                className={`request-row request-row--document request-detail-card ${
                  targetRequestId === item.id ? "row-highlight" : ""
                }`}
                key={item.id}
              >
                <div className="request-detail-card__top">
                  <div>
                    <span className="request-detail-card__crumb">{filterLabels.detailsCrumb}</span>
                    <h3>{readableTitle}</h3>
                  </div>
                  <span className={`tag ${statusClass}`}>{readableStatus(item.status)}</span>
                </div>

                <div className="request-detail-card__body">
                  <section className="request-detail-card__summary">
                    <dl>
                      <div>
                        <dt>{filterLabels.author}</dt>
                        <dd>{readableAuthor}</dd>
                      </div>
                      <div>
                        <dt>{filterLabels.role}</dt>
                        <dd>{translateRole(item.authorRoleCode || "TEACHER", language) || filterLabels.teacher}</dd>
                      </div>
                      <div>
                        <dt>{filterLabels.date}</dt>
                        <dd>{formatShortDate(item.createdAt || item.startDate, language)}</dd>
                      </div>
                      <div>
                        <dt>{filterLabels.recipientTo}</dt>
                        <dd>{currentRecipient}</dd>
                      </div>
                    </dl>

                    {item.directorComment ? (
                      <p className="request-detail-card__note">
                        {t("requests.directorComment")}: {readableText(item.directorComment, "")}
                      </p>
                    ) : null}
                    {item.completedComment ? (
                      <p className="request-detail-card__note">
                        {t("requests.completedComment")}: {readableText(item.completedComment, "")}
                      </p>
                    ) : null}
                    {item.isOfficial ? <p className="request-official-label">{t("requests.officialBadge")}</p> : null}
                  </section>

                  <aside className="request-history request-detail-card__route">
                    <strong>{filterLabels.routeTitle}</strong>
                    {(item.routeHistory?.length ? item.routeHistory : []).slice(-3).map((step) => (
                      <div className="request-history__item" key={step.id}>
                        <span>{readableStatus(step.status)}</span>
                        <small>{new Date(step.createdAt).toLocaleString(getLocale(language))}</small>
                        <em>
                          {readableText(step.actorName, filterLabels.employee)} → {getRouteTarget(step)}
                        </em>
                      </div>
                    ))}
                    {!item.routeHistory?.length ? (
                      <div className="request-history__item">
                        <span>{readableStatus(item.status)}</span>
                        <small>{detailLabels.noTarget}</small>
                      </div>
                    ) : null}
                  </aside>
                </div>

                <p className="request-detail-card__reason">{readableReason}</p>

                {item.directorSignature ? (
                  <div className="request-signature-details">
                    <p>
                      {t("requests.signedBy")}: {readableText(item.directorSignature.signedBy, "Директор")} ·{" "}
                      {new Date(item.directorSignature.signedAt).toLocaleString(getLocale(language))}
                    </p>
                    {item.directorSignature.signatureCode ? (
                      <code>
                        {detailLabels.signatureCode}: {item.directorSignature.signatureCode}
                      </code>
                    ) : null}
                  </div>
                ) : null}

                {editingRequestId === item.id && editForm ? (
                  <form className="request-edit-form" onSubmit={(event) => saveEditedRequest(event, item)}>
                    <label>
                      {t("requests.type")}
                      <select
                        className={editFieldErrors.type ? "input-error" : ""}
                        value={editForm.type}
                        onChange={(event) => updateEditField("type", event.target.value)}
                      >
                        {!requestTypes.includes(editForm.type) && editForm.type ? (
                          <option value={editForm.type}>{translateRequestType(editForm.type, language)}</option>
                        ) : null}
                        {requestTypes.map((type) => (
                          <option key={type} value={type}>
                            {translateRequestType(type, language)}
                          </option>
                        ))}
                      </select>
                      {editFieldErrors.type ? <span className="field-error-text">{editFieldErrors.type}</span> : null}
                    </label>
                    <label>
                      {t("requests.documentTitle")}
                      <input
                        className={editFieldErrors.documentTitle ? "input-error" : ""}
                        value={editForm.documentTitle}
                        onChange={(event) => updateEditField("documentTitle", event.target.value)}
                      />
                      {editFieldErrors.documentTitle ? (
                        <span className="field-error-text">{editFieldErrors.documentTitle}</span>
                      ) : null}
                    </label>
                    <label>
                      {t("requests.startDate")}
                      <input
                        type="date"
                        value={editForm.startDate}
                        onChange={(event) => updateEditField("startDate", event.target.value)}
                      />
                    </label>
                    <label>
                      {t("requests.endDate")}
                      <input
                        className={editFieldErrors.endDate ? "input-error" : ""}
                        type="date"
                        value={editForm.endDate}
                        onChange={(event) => updateEditField("endDate", event.target.value)}
                      />
                      {editFieldErrors.endDate ? <span className="field-error-text">{editFieldErrors.endDate}</span> : null}
                    </label>
                    <label>
                      {t("requests.absenceTime")}
                      <input
                        value={editForm.absenceTime}
                        onChange={(event) => updateEditField("absenceTime", event.target.value)}
                      />
                    </label>
                    <label className="request-edit-form__full">
                      {t("requests.reason")}
                      <textarea
                        className={editFieldErrors.reason ? "input-error" : ""}
                        value={editForm.reason}
                        onChange={(event) => updateEditField("reason", event.target.value)}
                      />
                      {editFieldErrors.reason ? <span className="field-error-text">{editFieldErrors.reason}</span> : null}
                    </label>
                    <label className="request-edit-form__full">
                      {t("requests.comment")}
                      <textarea
                        value={editForm.comment}
                        onChange={(event) => updateEditField("comment", event.target.value)}
                      />
                    </label>
                    <label className="request-edit-form__full">
                      {filterLabels.replaceAttachment}
                      <input
                        type="file"
                        accept={DOCUMENT_ACCEPT}
                        onChange={(event) => updateEditField("attachment", event.target.files?.[0] || null)}
                      />
                      {item.attachment?.fileName ? (
                        <span>
                          {filterLabels.currentAttachment}: {item.attachment.fileName}
                        </span>
                      ) : null}
                    </label>
                    <div className="inline-actions request-edit-form__full">
                      <button className="primary-button" type="submit">
                        {filterLabels.saveEdit}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => {
                          setEditingRequestId("");
                          setEditForm(null);
                          setEditFieldErrors({});
                        }}
                      >
                        {filterLabels.cancelEdit}
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="request-detail-card__footer">
                  <div className="request-detail-card__files">
                    <strong>{filterLabels.attachedFiles}</strong>
                    <div>
                      {requestFiles.length ? (
                        requestFiles.map((file) => (
                          <button className="request-doc-link" type="button" key={file.path} onClick={() => openRequestFile(file.path)}>
                            {file.label}
                          </button>
                        ))
                      ) : (
                        <span>{filterLabels.noFile}</span>
                      )}
                    </div>
                  </div>

                  <div className={`request-row__actions ${showDirectorRoutes ? "request-row__actions--routes" : ""}`}>
                    {canReview && item.currentRecipientRole === "DIRECTOR" && !item.isOfficial ? (
                      <>
                        <button
                          className="danger-button request-action request-action--reject"
                          title={t("requests.reject")}
                          aria-label={t("requests.reject")}
                          onClick={() => rejectRequest(item)}
                        >
                          {t("requests.reject")}
                        </button>
                        <button
                          className="ghost-button request-action request-action--approve request-action--success"
                          title={t("requests.approve")}
                          aria-label={t("requests.approve")}
                          onClick={() => approveDocument(item)}
                        >
                          {t("requests.approve")}
                        </button>
                        <button
                          className="ghost-button request-action request-action--return"
                          title={t("requests.returnForRevision")}
                          aria-label={t("requests.returnForRevision")}
                          onClick={() => returnBeforeSignature(item)}
                        >
                          {t("requests.returnForRevision")}
                        </button>
                      </>
                    ) : null}

                    {user.roleCode === "TEACHER" && [DRAFT_STATUS, STATUS_RETURNED].includes(item.status) ? (
                      <>
                        <button
                          className="ghost-button request-action request-action--edit"
                          title={filterLabels.editRequest}
                          aria-label={filterLabels.editRequest}
                          onClick={() => startEditRequest(item)}
                        >
                          {filterLabels.editRequest}
                        </button>
                        <button
                          className="primary-button request-action request-action--submit"
                          title={t("requests.sendToDirector")}
                          aria-label={t("requests.sendToDirector")}
                          onClick={() => submitRequest(item)}
                        >
                          {t("requests.sendToDirector")}
                        </button>
                      </>
                    ) : null}

                    {canCompleteRequests && item.currentRecipientRole === user.roleCode && item.isOfficial ? (
                      <button
                        className="primary-button request-action request-action--complete"
                        title={t("requests.markCompleted")}
                        aria-label={t("requests.markCompleted")}
                        onClick={() => completeRequest(item)}
                      >
                        {t("requests.markCompleted")}
                      </button>
                    ) : null}

                    {showDirectorRoutes ? (
                      <div className="route-actions">
                        {directorRoutes.map((route) => (
                          <button
                            className="ghost-button request-action request-action--route route-action-card"
                            title={route.label}
                            aria-label={route.label}
                            key={route.status}
                            onClick={() => routeDocument(item, route)}
                          >
                            <span className="route-action-title">{route.shortLabel}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState title={t("requests.noDocuments")} text={t("requests.noDocumentsText")} />
        )}
      </section>
    </div>
  );
}
