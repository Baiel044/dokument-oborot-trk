import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { translateDocumentCategory } from "../../utils/localization";

const DEFAULT_CATEGORY = "statements";
const STATUS_FILTERS = ["all", "approved", "pending", "returned"];
const APPROVED_STATUS_VALUES = ["approved", "approved_by_director", "accepted", "бекитилди", "одобрено", "директор кол койду"];
const PENDING_STATUS_VALUES = ["pending", "waiting", "review", "sent", "read", "күт", "кароодо", "карап жатат", "на рассмотрении"];
const RETURNED_STATUS_VALUES = ["returned", "rejected", "кайтарылды", "четке кагылды", "возвращено", "отклонено"];

function formatDate(value, language) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "ky-KG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeStatusText(value) {
  return String(value || "").trim().toLowerCase();
}

function includesStatusValue(status, values) {
  return values.some((value) => status.includes(value));
}

function getDocumentStatusGroup(document) {
  const status = normalizeStatusText(
    document.status || document.approvalStatus || document.state || document.requestStatus || document.officialStatus
  );

  if (includesStatusValue(status, RETURNED_STATUS_VALUES)) {
    return "returned";
  }

  if (includesStatusValue(status, APPROVED_STATUS_VALUES)) {
    return "approved";
  }

  if (includesStatusValue(status, PENDING_STATUS_VALUES)) {
    return "pending";
  }

  const assignmentStatuses = (document.assignments || []).map((assignment) => normalizeStatusText(assignment.status));
  if (assignmentStatuses.some((assignmentStatus) => ["sent", "read"].includes(assignmentStatus))) {
    return "pending";
  }

  if (document.isOfficial || document.generatedOnLetterhead || document.sourceRequestId) {
    return "approved";
  }

  return "";
}

function DocumentStatusIcon({ type }) {
  const commonProps = {
    className: "documents-status-card__svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (type === "approved") {
    return (
      <svg {...commonProps}>
        <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
        <path d="m8 11 3 3 8-8" />
      </svg>
    );
  }

  if (type === "pending") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (type === "returned") {
    return (
      <svg {...commonProps}>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10a7 7 0 1 1-5.6 11.2" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

function DocumentActionIcon({ type }) {
  const commonProps = {
    className: "documents-action-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (type === "delete") {
    return (
      <svg {...commonProps}>
        <path d="M4 7h16" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M6 7l1 14h10l1-14" />
        <path d="M9 7V4h6v3" />
      </svg>
    );
  }

  if (type === "file") {
    return (
      <svg {...commonProps}>
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v5h5" />
        <path d="M9 13h6" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function DocumentsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetDocumentId = searchParams.get("document") || "";
  const canManageDocuments = ["DIRECTOR", "ADMIN"].includes(user.roleCode);

  const labels =
    language === "ru"
      ? {
          title: "Документы",
          newDocument: "Новый документ загрузить",
          search: "Поиск...",
          category: "Категория",
          allCategories: "Все категории",
          no: "№",
          name: "Название",
          mark: "Метка",
          date: "Дата",
          action: "Действие",
          noMark: "—",
          officialBlank: "Официальный бланк",
          uploadPanel: "Загрузка документа",
          supportedFormats: "Поддерживаются PDF, Word и Excel",
          uploadFile: "Загрузить файл",
          generateLetterhead: "Создать на фирменном бланке",
          letterheadHint: "Для фирменного бланка заполните название и описание. Файл прикладывать не нужно.",
          titleRequired: "Для создания документа на фирменном бланке укажите название документа.",
          templatePanel: "Шаблон бланка",
          templateCurrent: "Текущий шаблон",
          templateMissing: "Шаблон ещё не загружен",
          templateUpdatedAt: "Обновлён",
          templateFile: "PDF-шаблон",
          templateUpload: "Обновить шаблон",
          templateOpen: "Открыть шаблон",
          templateSuccess: "PDF-шаблон фирменного бланка обновлён.",
          templateOpenError: "Не удалось открыть PDF-шаблон.",
          assignTitle: "Направить документ",
          recipient: "Получатель",
          chooseRecipient: "Выберите сотрудника",
          assignmentType: "Тип поручения",
          execution: "К исполнению",
          review: "Для ознакомления",
          comment: "Комментарий директора",
          commentPlaceholder: "Что нужно сделать с документом",
          sendAssignment: "Отправить",
          assignmentSuccess: "Документ направлен сотруднику.",
          assignmentHistory: "История направлений",
          assignedBy: "Направил",
          assignedTo: "Получатель",
          incomingTitle: "Входящие поручения",
          incomingText: "Документы, которые директор направил вам к исполнению или для ознакомления.",
          noIncoming: "Поручений пока нет.",
          sentAt: "Дата",
          markRead: "Ознакомлен",
          markCompleted: "Исполнено",
          statusSent: "Направлено",
          statusRead: "Ознакомлен",
          statusCompleted: "Исполнено",
          assignmentUpdated: "Статус поручения обновлён.",
          deleteDocument: "Удалить",
          confirmDelete: "Удалить документ из архива",
          documentDeleted: "Документ удалён из архива.",
          openFile: "Открыть файл",
          noFile: "Нет файла",
          setup: "Настроить",
          statAll: "Все документы",
          statApproved: "Одобрено",
          statPending: "На рассмотрении",
          statReturned: "Возвращено",
          officialDocument: "Фирменный документ",
          pdfReady: "PDF готов",
          pdfMissing: "PDF ещё не создан",
          openPdf: "Открыть PDF",
          downloadPdf: "Скачать PDF",
          generatePdf: "Сгенерировать PDF",
          pdfLoading: "PDF загружается...",
          pdfLoadError: "Ошибка при загрузке PDF",
          pdfGenerateError: "Ошибка при генерации PDF",
          viewDocument: "Открыть документ",
          documentDetails: "Просмотр документа",
          author: "Автор",
          status: "Статус",
          description: "Основной текст",
          routeHistoryTitle: "История маршрута",
          noRouteHistory: "История маршрута отсутствует.",
          close: "Закрыть",
          deleteQuestion: "Вы действительно хотите удалить этот документ?",
          deleteWarning: "Это действие нельзя отменить.",
          cancelDelete: "Отмена",
          confirmDeleteAction: "Удалить",
          deleteError: "Не удалось удалить документ",
        }
      : {
          title: "Документтер",
          newDocument: "Жаңы документ жүктөө",
          search: "Поиск...",
          category: "Категория",
          allCategories: "Бардык категориялар",
          no: "№",
          name: "Название",
          mark: "Метка",
          date: "Дата",
          action: "Аракет",
          noMark: "—",
          officialBlank: "Официальный бланк",
          uploadPanel: "Документ жүктөө",
          supportedFormats: "PDF, Word жана Excel файлдары колдоого алынат",
          uploadFile: "Файлды жүктөө",
          generateLetterhead: "Фирмалык бланкта түзүү",
          letterheadHint: "Фирмалык бланк үчүн документтин аталышын жана сүрөттөмөсүн жазыңыз. Файл керек эмес.",
          titleRequired: "Фирмалык бланкта түзүү үчүн документтин аталышын жазыңыз.",
          templatePanel: "Бланк шаблону",
          templateCurrent: "Учурдагы шаблон",
          templateMissing: "Шаблон азырынча жүктөлө элек",
          templateUpdatedAt: "Жаңыртылган",
          templateFile: "PDF-шаблон",
          templateUpload: "Шаблонду жаңыртуу",
          templateOpen: "Шаблонду ачуу",
          templateSuccess: "Фирмалык бланктын PDF шаблону жаңырды.",
          templateOpenError: "PDF-шаблонду ачуу мүмкүн болгон жок.",
          assignTitle: "Документти жөнөтүү",
          recipient: "Алуучу",
          chooseRecipient: "Кызматкерди тандаңыз",
          assignmentType: "Тапшырма түрү",
          execution: "Аткарууга",
          review: "Таанышууга",
          comment: "Директордун комментарийи",
          commentPlaceholder: "Документ боюнча эмне кылуу керек",
          sendAssignment: "Жөнөтүү",
          assignmentSuccess: "Документ кызматкерге жөнөтүлдү.",
          assignmentHistory: "Жөнөтүү тарыхы",
          assignedBy: "Жөнөткөн",
          assignedTo: "Алуучу",
          incomingTitle: "Кирген тапшырмалар",
          incomingText: "Директор сизге аткарууга же таанышууга жөнөткөн документтер.",
          noIncoming: "Азырынча тапшырма жок.",
          sentAt: "Дата",
          markRead: "Тааныштым",
          markCompleted: "Аткарылды",
          statusSent: "Жөнөтүлдү",
          statusRead: "Окулду",
          statusCompleted: "Аткарылды",
          assignmentUpdated: "Тапшырманын абалы жаңырды.",
          deleteDocument: "Өчүрүү",
          confirmDelete: "Документти архивден өчүрүү",
          documentDeleted: "Документ архивден өчүрүлдү.",
          openFile: "Файлды ачуу",
          noFile: "Файл жок",
          setup: "Настроить",
          statAll: "Бардык документ",
          statApproved: "Бекитилди",
          statPending: "Күтүүдө",
          statReturned: "Кайтарылды",
          officialDocument: "Фирмалык документ",
          pdfReady: "PDF даяр",
          pdfMissing: "PDF азырынча түзүлгөн эмес",
          openPdf: "PDF көрүү",
          downloadPdf: "PDF жүктөө",
          generatePdf: "PDF түзүү",
          pdfLoading: "PDF жүктөлүүдө...",
          pdfLoadError: "PDFти жүктөөдө ката кетти",
          pdfGenerateError: "PDF түзүүдө ката кетти",
          viewDocument: "Документти ачуу",
          documentDetails: "Документти көрүү",
          author: "Автор",
          status: "Статус",
          description: "Негизги текст",
          routeHistoryTitle: "Маршрут тарыхы",
          noRouteHistory: "Маршрут тарыхы жок.",
          close: "Жабуу",
          deleteQuestion: "Бул документти чын эле өчүрөсүзбү?",
          deleteWarning: "Бул аракетти артка кайтаруу мүмкүн эмес.",
          cancelDelete: "Жокко чыгаруу",
          confirmDeleteAction: "Өчүрүү",
          deleteError: "Документти өчүрүү мүмкүн болгон жок",
        };

  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [letterheadTemplate, setLetterheadTemplate] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [templateMessage, setTemplateMessage] = useState("");
  const [error, setError] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentForms, setAssignmentForms] = useState({});
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState(() => {
    const status = searchParams.get("status");
    return ["draft", "submitted", "pending", "approved", "returned", "rejected", "completed"].includes(status)
      ? status
      : "all";
  });
  const [pdfLoadingId, setPdfLoadingId] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    category: DEFAULT_CATEGORY,
    description: "",
    file: null,
  });

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!targetDocumentId) {
      return;
    }

    const targetDocument = documents.find((item) => item.id === targetDocumentId);
    if (targetDocument) {
      setSelectedDocument(targetDocument);
    }
  }, [documents, targetDocumentId]);

  async function loadPage() {
    setDocumentsLoading(true);
    setError("");

    const requests = [
      api.get("/api/documents"),
      api.get("/api/meta/catalogs"),
    ];

    if (canManageDocuments) {
      requests.push(api.get("/api/users/directory"));
      requests.push(api.get("/api/documents/letterhead-template"));
    }

    try {
      const [documentsData, catalogs, usersData, templateData] = await Promise.all(requests);
      setDocuments(documentsData.documents || []);
      setCategories(catalogs.documentCategories || []);
      setUsers(usersData?.users || []);
      setLetterheadTemplate(templateData?.template || null);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setDocumentsLoading(false);
    }
  }

  function resetForm() {
    setForm({
      title: "",
      category: DEFAULT_CATEGORY,
      description: "",
      file: null,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("category", form.category);
      payload.append("description", form.description);
      if (form.file) {
        payload.append("file", form.file);
      }

      await api.post("/api/documents", payload);
      resetForm();
      setShowUploadPanel(false);
      loadPage();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function handleGenerateLetterhead() {
    setError("");

    if (!form.title.trim()) {
      setError(labels.titleRequired);
      return;
    }

    try {
      await api.post("/api/documents/generate-letterhead", {
        title: form.title,
        category: form.category,
        description: form.description,
      });
      resetForm();
      setShowUploadPanel(false);
      loadPage();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function handleTemplateUpload(event) {
    event.preventDefault();
    setError("");
    setTemplateMessage("");

    if (!templateFile) {
      setError(labels.templateMissing);
      return;
    }

    try {
      const payload = new FormData();
      payload.append("template", templateFile);
      const data = await api.post("/api/documents/letterhead-template", payload);
      setLetterheadTemplate(data.template);
      setTemplateFile(null);
      setTemplateMessage(labels.templateSuccess);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function openLetterheadTemplate() {
    setError("");
    setTemplateMessage("");

    try {
      const blob = await api.download("/api/documents/letterhead-template/file");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (submitError) {
      setError(submitError.message || labels.templateOpenError);
    }
  }

  function getAssignmentForm(documentId) {
    return assignmentForms[documentId] || {
      recipientId: "",
      assignmentType: "execution",
      comment: "",
    };
  }

  function updateAssignmentForm(documentId, field, value) {
    const current = getAssignmentForm(documentId);
    setAssignmentForms((forms) => ({
      ...forms,
      [documentId]: {
        ...current,
        [field]: value,
      },
    }));
  }

  async function assignDocument(documentId) {
    const assignmentForm = getAssignmentForm(documentId);
    setError("");
    setAssignmentMessage("");

    try {
      await api.post(`/api/documents/${documentId}/assign`, assignmentForm);
      setAssignmentForms((forms) => ({
        ...forms,
        [documentId]: {
          recipientId: "",
          assignmentType: "execution",
          comment: "",
        },
      }));
      setAssignmentMessage(labels.assignmentSuccess);
      loadPage();
      window.dispatchEvent(new Event("app:badges-refresh"));
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function updateAssignmentStatus(documentId, assignmentId, status) {
    setError("");
    setAssignmentMessage("");

    try {
      await api.put(`/api/documents/${documentId}/assignments/${assignmentId}/status`, { status });
      setAssignmentMessage(labels.assignmentUpdated);
      loadPage();
      window.dispatchEvent(new Event("app:badges-refresh"));
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function getAssignmentStatusLabel(status) {
    if (status === "completed") {
      return labels.statusCompleted;
    }
    if (status === "read") {
      return labels.statusRead;
    }
    return labels.statusSent;
  }

  function canDeleteDocument(document) {
    return document.uploadedBy === user.id || ["ADMIN", "DIRECTOR"].includes(user.roleCode);
  }

  function openDocumentDetails(document) {
    setSelectedDocument(document);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("document", document.id);
    setSearchParams(nextParams);
  }

  function closeDocumentDetails() {
    setSelectedDocument(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("document");
    setSearchParams(nextParams);
  }

  function requestDeleteDocument(document) {
    setDeleteCandidate(document);
  }

  async function confirmDeleteDocument() {
    if (!deleteCandidate) {
      return;
    }

    const document = deleteCandidate;
    setError("");
    setAssignmentMessage("");

    try {
      await api.delete(`/api/documents/${document.id}`);
      setDocuments((currentDocuments) => currentDocuments.filter((item) => item.id !== document.id));
      if (selectedDocument?.id === document.id) {
        closeDocumentDetails();
      }
      setDeleteCandidate(null);
      setAssignmentMessage(labels.documentDeleted);
    } catch (submitError) {
      setError(submitError.message || labels.deleteError);
    }
  }

  async function openDocumentFile(filePath) {
    setError("");

    try {
      await api.openFile(filePath);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  function getOfficialPdf(document) {
    if (typeof document.officialPdf === "string") {
      return { filePath: document.officialPdf };
    }

    if (document.officialPdf?.filePath || document.officialPdf?.downloadPath || document.officialPdf?.fileName) {
      return document.officialPdf;
    }

    return null;
  }

  function getPdfFileName(officialPdf) {
    const pathValue = officialPdf?.downloadPath || officialPdf?.filePath || officialPdf?.fileName || "";
    return String(pathValue).split("/").filter(Boolean).pop() || "";
  }

  function getOfficialPdfApiPath(document) {
    const officialPdf = getOfficialPdf(document);
    const fileName = getPdfFileName(officialPdf);
    if (!fileName) {
      return "";
    }

    return `/api/files/${encodeURIComponent(fileName)}`;
  }

  function getOfficialPdfDownloadName(document) {
    const baseName = String(document.documentNumber || document.title || document.fileName || "official-document")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .trim();
    return `${baseName || "official-document"}.pdf`;
  }

  function hasOfficialPdf(document) {
    return Boolean(getOfficialPdfApiPath(document));
  }

  function canGenerateOfficialPdf(document) {
    return !hasOfficialPdf(document) && getDocumentStatusGroup(document) === "approved";
  }

  async function openOfficialPdf(document) {
    const path = getOfficialPdfApiPath(document);
    if (!path) {
      return;
    }

    setPdfError("");
    setPdfLoadingId(`${document.id}:open`);

    try {
      const blob = await api.download(path);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (submitError) {
      setPdfError(submitError.message || labels.pdfLoadError);
    } finally {
      setPdfLoadingId("");
    }
  }

  async function downloadOfficialPdf(document) {
    const path = getOfficialPdfApiPath(document);
    if (!path) {
      return;
    }

    setPdfError("");
    setPdfLoadingId(`${document.id}:download`);

    try {
      const blob = await api.download(path);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = getOfficialPdfDownloadName(document);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (submitError) {
      setPdfError(submitError.message || labels.pdfLoadError);
    } finally {
      setPdfLoadingId("");
    }
  }

  async function generateOfficialPdf(document) {
    setPdfError("");
    setPdfLoadingId(`${document.id}:generate`);

    try {
      const data = await api.post(`/api/documents/${document.id}/generate-pdf`, {});
      setDocuments((currentDocuments) =>
        currentDocuments.map((item) => (item.id === document.id ? data.document : item))
      );
      setSelectedDocument((currentDocument) =>
        currentDocument?.id === document.id ? data.document : currentDocument
      );
      setAssignmentMessage(labels.pdfReady);
    } catch (submitError) {
      setPdfError(submitError.message || labels.pdfGenerateError);
    } finally {
      setPdfLoadingId("");
    }
  }

  const statusCards = STATUS_FILTERS.map((filter) => {
    const count =
      filter === "all"
        ? documents.length
        : documents.filter((document) => getDocumentStatusGroup(document) === filter).length;
    const labelsByFilter = {
      all: labels.statAll,
      approved: labels.statApproved,
      pending: labels.statPending,
      returned: labels.statReturned,
    };

    return {
      filter,
      count,
      label: labelsByFilter[filter],
    };
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredDocuments = documents.filter((document) => {
    if (activeStatusFilter !== "all" && getDocumentStatusGroup(document) !== activeStatusFilter) {
      return false;
    }
    if (categoryFilter && document.category !== categoryFilter) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }
    return [document.documentNumber, document.title, document.fileName, document.description, document.uploadedByName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });

  function chooseStatusFilter(status) {
    setActiveStatusFilter(status);
  }

  const incomingAssignments = documents.flatMap((document) =>
    (document.assignments || [])
      .filter((assignment) => assignment.recipientId === user.id)
      .map((assignment) => ({ ...assignment, document }))
  );

  return (
    <div className="documents-model">
      <section className="documents-model__header">
        <h1>{labels.title}</h1>
        <div className="documents-model__actions">
          {canManageDocuments ? (
            <button className="ghost-button" type="button" onClick={() => setShowTemplatePanel((value) => !value)}>
              {labels.templatePanel}
            </button>
          ) : null}
          <button className="primary-button" type="button" onClick={() => setShowUploadPanel((value) => !value)}>
            + {labels.newDocument}
          </button>
        </div>
      </section>

      {showUploadPanel ? (
        <form className="panel documents-model__form" onSubmit={handleSubmit}>
          <div className="panel__header">
            <h3>{labels.uploadPanel}</h3>
          </div>
          <div className="grid-form">
            <label>
              {t("documents.title")}
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label>
              {t("documents.category")}
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {translateDocumentCategory(category, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid-form__full">
              {t("documents.description")}
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <label className="grid-form__full">
              {t("documents.file")}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })}
              />
              <span>{labels.supportedFormats}</span>
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <p className="muted-text">{labels.letterheadHint}</p>
          <div className="inline-actions">
            <button className="primary-button" type="submit">
              {labels.uploadFile}
            </button>
            <button className="ghost-button" type="button" onClick={handleGenerateLetterhead}>
              {labels.generateLetterhead}
            </button>
          </div>
        </form>
      ) : null}

      {canManageDocuments && showTemplatePanel ? (
        <form className="panel documents-model__form" onSubmit={handleTemplateUpload}>
          <div className="panel__header">
            <div>
              <h3>{labels.templatePanel}</h3>
              <p className="muted-text">
                {labels.templateCurrent}:{" "}
                {letterheadTemplate?.exists
                  ? `${letterheadTemplate.fileName} · ${labels.templateUpdatedAt}: ${formatDate(
                      letterheadTemplate.updatedAt,
                      language
                    )}`
                  : labels.templateMissing}
              </p>
            </div>
            <span className={`tag ${letterheadTemplate?.exists ? "tag--green" : "tag--orange"}`}>
              {letterheadTemplate?.exists ? labels.officialBlank : labels.templateMissing}
            </span>
          </div>
          <div className="grid-form">
            <label className="grid-form__full">
              {labels.templateFile}
              <input type="file" accept=".pdf,application/pdf" onChange={(event) => setTemplateFile(event.target.files?.[0] || null)} />
            </label>
          </div>
          <div className="inline-actions">
            <button className="primary-button" type="submit">
              {labels.templateUpload}
            </button>
            {letterheadTemplate?.exists ? (
              <button className="ghost-button" type="button" onClick={openLetterheadTemplate}>
                {labels.templateOpen}
              </button>
            ) : null}
          </div>
          {templateMessage ? <p className="form-success">{templateMessage}</p> : null}
        </form>
      ) : null}

      <section className="panel documents-model__table-card">
        <div className="documents-status-grid">
          {statusCards.map((card) => (
            <button
              className={`documents-status-card documents-status-card--${card.filter} ${
                activeStatusFilter === card.filter ? "documents-status-card--active" : ""
              }`}
              type="button"
              key={card.filter}
              onClick={() => chooseStatusFilter(card.filter)}
              aria-pressed={activeStatusFilter === card.filter}
            >
              <span className="documents-status-card__icon" aria-hidden="true">
                <DocumentStatusIcon type={card.filter} />
              </span>
              <span className="documents-status-card__content">
                <strong>{card.count}</strong>
                <span>{card.label}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="documents-model__filters">
          <label className="documents-model__search">
            <input
              value={searchTerm}
              placeholder={labels.search}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <label className="documents-model__category">
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">{labels.category}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {translateDocumentCategory(category, language)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {documentsLoading ? (
          <p className="documents-loading">Загрузка документов...</p>
        ) : filteredDocuments.length ? (
          <div className="documents-table">
            <div className="documents-table__head">
              <span>{labels.no}</span>
              <span>{labels.name}</span>
              <span>{labels.category}</span>
              <span>{labels.mark}</span>
              <span>{labels.date}</span>
              <span>{labels.action}</span>
            </div>

            {filteredDocuments.map((item, index) => {
              const assignmentForm = getAssignmentForm(item.id);
              const hasOfficialMark = item.generatedOnLetterhead || item.isOfficial || item.sourceRequestId;
              const officialPdfExists = hasOfficialPdf(item);
              const pdfLoading = pdfLoadingId.startsWith(`${item.id}:`);
              const showPdfPanel = hasOfficialMark || officialPdfExists || canGenerateOfficialPdf(item);

              return (
                <div className={`documents-table__item ${targetDocumentId === item.id ? "row-highlight" : ""}`} key={item.id}>
                  <div
                    className="documents-table__row documents-table__row--clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => openDocumentDetails(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDocumentDetails(item);
                      }
                    }}
                  >
                    <span>{item.documentNumber || index + 1}</span>
                    <strong>{item.title}</strong>
                    <span>{translateDocumentCategory(item.category, language)}</span>
                    <span className="document-official-tags">
                      {hasOfficialMark ? <b>{labels.officialDocument}</b> : labels.noMark}
                      {officialPdfExists ? <span className="tag tag--green">{labels.pdfReady}</span> : null}
                    </span>
                    <span>{formatDate(item.createdAt, language)}</span>
                    <span className="documents-table__actions">
                      <button
                        className="icon-button documents-action-button documents-action-button--view"
                        type="button"
                        title={labels.viewDocument}
                        aria-label={labels.viewDocument}
                        onClick={(event) => {
                          event.stopPropagation();
                          openDocumentDetails(item);
                        }}
                      >
                        <DocumentActionIcon type="view" />
                      </button>
                      {item.filePath ? (
                        <button
                          className="icon-button documents-action-button documents-action-button--file"
                          type="button"
                          title={labels.openFile}
                          aria-label={labels.openFile}
                          onClick={(event) => {
                            event.stopPropagation();
                            openDocumentFile(item.filePath);
                          }}
                        >
                          ◉
                        </button>
                      ) : (
                        <span className="tag">{labels.noFile}</span>
                      )}
                      {canDeleteDocument(item) ? (
                        <button
                          className="icon-button documents-action-button documents-action-button--delete"
                          type="button"
                          title={labels.deleteDocument}
                          aria-label={labels.deleteDocument}
                          onClick={(event) => {
                            event.stopPropagation();
                            requestDeleteDocument(item);
                          }}
                        >
                          −
                        </button>
                      ) : null}
                    </span>
                  </div>

                  {showPdfPanel ? (
                    <div className="document-pdf-panel">
                      <div className="document-pdf-panel__meta">
                        {item.documentNumber ? <span className="tag tag--blue">{item.documentNumber}</span> : null}
                        {hasOfficialMark ? <span className="tag tag--purple">{labels.officialDocument}</span> : null}
                        {officialPdfExists ? (
                          <span className="tag tag--green">{labels.pdfReady}</span>
                        ) : (
                          <span className="tag tag--gray">{labels.pdfMissing}</span>
                        )}
                      </div>
                      <div className="document-pdf-panel__actions">
                        {officialPdfExists ? (
                          <>
                            <button
                              className="pdf-action-button pdf-action-button--primary"
                              type="button"
                              onClick={() => openOfficialPdf(item)}
                              disabled={pdfLoading}
                            >
                              {pdfLoadingId === `${item.id}:open` ? labels.pdfLoading : labels.openPdf}
                            </button>
                            <button
                              className="pdf-action-button"
                              type="button"
                              onClick={() => downloadOfficialPdf(item)}
                              disabled={pdfLoading}
                            >
                              {pdfLoadingId === `${item.id}:download` ? labels.pdfLoading : labels.downloadPdf}
                            </button>
                          </>
                        ) : canGenerateOfficialPdf(item) ? (
                          <button
                            className="pdf-action-button pdf-action-button--primary"
                            type="button"
                            onClick={() => generateOfficialPdf(item)}
                            disabled={pdfLoading}
                          >
                            {pdfLoadingId === `${item.id}:generate` ? labels.pdfLoading : labels.generatePdf}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {canManageDocuments ? (
                    <details className="documents-table__details">
                      <summary>{labels.setup}</summary>
                      <div className="document-assignment">
                        {item.documentNumber ? <span className="tag tag--blue">{item.documentNumber}</span> : null}
                        <strong>{labels.assignTitle}</strong>
                        <div className="document-assignment__grid">
                          <label>
                            {labels.recipient}
                            <select
                              value={assignmentForm.recipientId}
                              onChange={(event) => updateAssignmentForm(item.id, "recipientId", event.target.value)}
                            >
                              <option value="">{labels.chooseRecipient}</option>
                              {users.map((directoryUser) => (
                                <option key={directoryUser.id} value={directoryUser.id}>
                                  {directoryUser.fullName}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            {labels.assignmentType}
                            <select
                              value={assignmentForm.assignmentType}
                              onChange={(event) => updateAssignmentForm(item.id, "assignmentType", event.target.value)}
                            >
                              <option value="execution">{labels.execution}</option>
                              <option value="review">{labels.review}</option>
                            </select>
                          </label>
                          <label className="document-assignment__comment">
                            {labels.comment}
                            <input
                              value={assignmentForm.comment}
                              placeholder={labels.commentPlaceholder}
                              onChange={(event) => updateAssignmentForm(item.id, "comment", event.target.value)}
                            />
                          </label>
                          <button className="primary-button" type="button" onClick={() => assignDocument(item.id)}>
                            {labels.sendAssignment}
                          </button>
                        </div>
                      </div>
                    </details>
                  ) : null}

                  {item.assignments?.length ? (
                    <details className="documents-table__details">
                      <summary>{labels.assignmentHistory}</summary>
                      <div className="assignment-history">
                        {item.assignments.map((assignment) => (
                          <div className="assignment-history__item" key={assignment.id}>
                            <span className="tag tag--blue">
                              {assignment.assignmentType === "execution" ? labels.execution : labels.review}
                            </span>
                            <span className={`tag ${assignment.status === "completed" ? "tag--green" : assignment.status === "read" ? "tag--blue" : "tag--orange"}`}>
                              {getAssignmentStatusLabel(assignment.status)}
                            </span>
                            <p>
                              {labels.assignedBy}: {assignment.senderName} · {labels.assignedTo}: {assignment.recipientName}
                            </p>
                            {assignment.comment ? <p>{assignment.comment}</p> : null}
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title={t("documents.noDocuments")} text={t("documents.noDocumentsText")} />
        )}

        {assignmentMessage ? <p className="form-success">{assignmentMessage}</p> : null}
        {pdfError ? <p className="form-error">{pdfError}</p> : null}
      </section>

      {!canManageDocuments ? (
        <section className="panel documents-model__form">
          <div className="panel__header">
            <div>
              <h3>{labels.incomingTitle}</h3>
              <p className="muted-text">{labels.incomingText}</p>
            </div>
            <span className="panel-counter">{incomingAssignments.length}</span>
          </div>

          {incomingAssignments.length ? (
            incomingAssignments.map((assignment) => (
              <article className="incoming-assignment" key={assignment.id}>
                <div>
                  <span className="tag tag--blue">
                    {assignment.assignmentType === "execution" ? labels.execution : labels.review}
                  </span>
                  <strong>{assignment.document.title}</strong>
                  {assignment.document.documentNumber ? <span className="tag tag--blue">{assignment.document.documentNumber}</span> : null}
                  <p>
                    {labels.assignedBy}: {assignment.senderName} · {labels.sentAt}: {formatDate(assignment.createdAt, language)}
                  </p>
                  {assignment.comment ? <p>{assignment.comment}</p> : null}
                  <span className={`tag ${assignment.status === "completed" ? "tag--green" : assignment.status === "read" ? "tag--blue" : "tag--orange"}`}>
                    {getAssignmentStatusLabel(assignment.status)}
                  </span>
                </div>
                <div className="inline-actions">
                  {assignment.document.filePath ? (
                    <button className="primary-button" type="button" onClick={() => openDocumentFile(assignment.document.filePath)}>
                      {labels.openFile}
                    </button>
                  ) : null}
                  {hasOfficialPdf(assignment.document) ? (
                    <>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => openOfficialPdf(assignment.document)}
                        disabled={pdfLoadingId.startsWith(`${assignment.document.id}:`)}
                      >
                        {pdfLoadingId === `${assignment.document.id}:open` ? labels.pdfLoading : labels.openPdf}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => downloadOfficialPdf(assignment.document)}
                        disabled={pdfLoadingId.startsWith(`${assignment.document.id}:`)}
                      >
                        {pdfLoadingId === `${assignment.document.id}:download` ? labels.pdfLoading : labels.downloadPdf}
                      </button>
                    </>
                  ) : canGenerateOfficialPdf(assignment.document) ? (
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => generateOfficialPdf(assignment.document)}
                      disabled={pdfLoadingId.startsWith(`${assignment.document.id}:`)}
                    >
                      {pdfLoadingId === `${assignment.document.id}:generate` ? labels.pdfLoading : labels.generatePdf}
                    </button>
                  ) : null}
                  {assignment.assignmentType === "review" && assignment.status !== "read" ? (
                    <button className="ghost-button" type="button" onClick={() => updateAssignmentStatus(assignment.document.id, assignment.id, "read")}>
                      {labels.markRead}
                    </button>
                  ) : null}
                  {assignment.assignmentType === "execution" && assignment.status !== "completed" ? (
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => updateAssignmentStatus(assignment.document.id, assignment.id, "completed")}
                    >
                      {labels.markCompleted}
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="muted-text">{labels.noIncoming}</p>
          )}
        </section>
      ) : null}

      {selectedDocument ? (
        <div className="document-modal-backdrop" role="presentation" onClick={closeDocumentDetails}>
          <section
            className="document-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="document-modal__header">
              <div>
                <span className="tag tag--blue">{selectedDocument.documentNumber || labels.noMark}</span>
                <h2 id="document-details-title">{labels.documentDetails}</h2>
              </div>
              <button className="icon-button" type="button" onClick={closeDocumentDetails} aria-label={labels.close}>
                ×
              </button>
            </div>

            <div className="document-modal__summary">
              <div>
                <span>{labels.name}</span>
                <strong>{selectedDocument.title || selectedDocument.fileName || labels.noMark}</strong>
              </div>
              <div>
                <span>{labels.author}</span>
                <strong>{selectedDocument.uploadedByName || labels.noMark}</strong>
              </div>
              <div>
                <span>{labels.status}</span>
                <strong>{selectedDocument.status || labels.noMark}</strong>
              </div>
              <div>
                <span>{labels.date}</span>
                <strong>{formatDate(selectedDocument.createdAt, language) || labels.noMark}</strong>
              </div>
              <div>
                <span>{labels.category}</span>
                <strong>{translateDocumentCategory(selectedDocument.category, language)}</strong>
              </div>
              <div>
                <span>{labels.recipient}</span>
                <strong>{selectedDocument.currentRecipientRole || labels.noMark}</strong>
              </div>
            </div>

            <div className="document-modal__section">
              <h3>{labels.description}</h3>
              <p>{selectedDocument.description || labels.noMark}</p>
            </div>

            <div className="document-modal__section">
              <h3>{labels.routeHistoryTitle}</h3>
              {selectedDocument.routeHistory?.length ? (
                <div className="document-modal__history">
                  {selectedDocument.routeHistory.map((step) => (
                    <article key={step.id || `${step.status}-${step.createdAt}`}>
                      <strong>{step.action || step.status || labels.status}</strong>
                      <span>{formatDate(step.createdAt, language)}</span>
                      <p>
                        {step.userName || labels.author}
                        {step.userRole ? ` (${step.userRole})` : ""}
                      </p>
                      {step.comment ? <small>{step.comment}</small> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p>{labels.noRouteHistory}</p>
              )}
            </div>

            <div className="document-modal__actions">
              {selectedDocument.filePath ? (
                <button className="ghost-button" type="button" onClick={() => openDocumentFile(selectedDocument.filePath)}>
                  {labels.openFile}
                </button>
              ) : null}
              {hasOfficialPdf(selectedDocument) ? (
                <>
                  <button
                    className="pdf-action-button pdf-action-button--primary"
                    type="button"
                    onClick={() => openOfficialPdf(selectedDocument)}
                    disabled={pdfLoadingId.startsWith(`${selectedDocument.id}:`)}
                  >
                    {pdfLoadingId === `${selectedDocument.id}:open` ? labels.pdfLoading : labels.openPdf}
                  </button>
                  <button
                    className="pdf-action-button"
                    type="button"
                    onClick={() => downloadOfficialPdf(selectedDocument)}
                    disabled={pdfLoadingId.startsWith(`${selectedDocument.id}:`)}
                  >
                    {pdfLoadingId === `${selectedDocument.id}:download` ? labels.pdfLoading : labels.downloadPdf}
                  </button>
                </>
              ) : canGenerateOfficialPdf(selectedDocument) ? (
                <button
                  className="pdf-action-button pdf-action-button--primary"
                  type="button"
                  onClick={() => generateOfficialPdf(selectedDocument)}
                  disabled={pdfLoadingId.startsWith(`${selectedDocument.id}:`)}
                >
                  {pdfLoadingId === `${selectedDocument.id}:generate` ? labels.pdfLoading : labels.generatePdf}
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {deleteCandidate ? (
        <div className="document-modal-backdrop" role="presentation" onClick={() => setDeleteCandidate(null)}>
          <section
            className="document-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="document-delete-title">{labels.confirmDelete}</h2>
            <p>{labels.deleteQuestion}</p>
            <small>{labels.deleteWarning}</small>
            <div className="document-confirm-modal__actions">
              <button className="ghost-button" type="button" onClick={() => setDeleteCandidate(null)}>
                {labels.cancelDelete}
              </button>
              <button className="danger-button" type="button" onClick={confirmDeleteDocument}>
                {labels.confirmDeleteAction}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
