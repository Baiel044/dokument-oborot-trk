import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { translateDocumentCategory } from "../../utils/localization";

const DEFAULT_CATEGORY = "orders";

export function DocumentsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const canAssignDocuments = ["DIRECTOR", "ADMIN"].includes(user.roleCode);
  const labels =
    language === "ru"
      ? {
          supportedFormats: "Поддерживаются PDF, Word и Excel",
          uploadFile: "Загрузить файл",
          generateLetterhead: "Создать на фирменном бланке",
          letterheadBadge: "Фирменный бланк",
          letterheadHint: "Для фирменного бланка заполните название и описание. Файл прикладывать не нужно.",
          titleRequired: "Для создания документа на фирменном бланке укажите название документа.",
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
        }
      : {
          supportedFormats: "PDF, Word жана Excel файлдары колдоого алынат",
          uploadFile: "Файлды жүктөө",
          generateLetterhead: "Фирмалык бланкта түзүү",
          letterheadBadge: "Фирмалык бланк",
          letterheadHint: "Фирмалык бланк үчүн документтин аталышын жана сүрөттөмөсүн жазыңыз. Файл керек эмес.",
          titleRequired: "Фирмалык бланкта түзүү үчүн документтин аталышын жазыңыз.",
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
        };

  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentForms, setAssignmentForms] = useState({});
  const [form, setForm] = useState({
    title: "",
    category: DEFAULT_CATEGORY,
    description: "",
    file: null,
  });

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    const requests = [
      api.get("/api/documents"),
      api.get("/api/meta/catalogs"),
    ];

    if (canAssignDocuments) {
      requests.push(api.get("/api/users/directory"));
    }

    const [documentsData, catalogs, usersData] = await Promise.all(requests);

    setDocuments(documentsData.documents);
    setCategories(catalogs.documentCategories || []);
    setUsers(usersData?.users || []);
  }

  function resetForm() {
    setForm({ title: "", category: DEFAULT_CATEGORY, description: "", file: null });
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
      loadPage();
    } catch (submitError) {
      setError(submitError.message);
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

  const incomingAssignments = documents.flatMap((document) =>
    (document.assignments || [])
      .filter((assignment) => assignment.recipientId === user.id)
      .map((assignment) => ({
        ...assignment,
        document,
      }))
  );

  return (
    <div className="page-stack">
      <form className="panel" onSubmit={handleSubmit}>
        <div className="panel__header">
          <h3>{t("documents.uploadTitle")}</h3>
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
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
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

      {!canAssignDocuments ? (
        <section className="panel">
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
                  <span className={`tag ${assignment.assignmentType === "execution" ? "tag--orange" : ""}`}>
                    {assignment.assignmentType === "execution" ? labels.execution : labels.review}
                  </span>
                  <strong>{assignment.document.title}</strong>
                  <p>
                    {labels.assignedBy}: {assignment.senderName} · {labels.sentAt}:{" "}
                    {new Date(assignment.createdAt).toLocaleString(language === "ru" ? "ru-RU" : "ky-KG")}
                  </p>
                  {assignment.comment ? <p>{assignment.comment}</p> : null}
                </div>
                {assignment.document.filePath ? (
                  <a
                    className="primary-button"
                    href={assignment.document.filePath}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("documents.openFile")}
                  </a>
                ) : null}
              </article>
            ))
          ) : (
            <p className="muted-text">{labels.noIncoming}</p>
          )}
        </section>
      ) : null}

      <section className="panel">
        <div className="panel__header">
          <h3>{t("documents.archive")}</h3>
        </div>
        {documents.length ? (
          documents.map((item) => {
            const assignmentForm = getAssignmentForm(item.id);

            return (
              <div className="document-row document-row--workflow" key={item.id}>
                <div className="document-row__main">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{translateDocumentCategory(item.category, language)}</p>
                    {item.generatedOnLetterhead ? (
                      <span className="request-official-label">{labels.letterheadBadge}</span>
                    ) : null}
                  </div>
                  {item.filePath ? (
                    <a className="ghost-button ghost-button--link" href={item.filePath} target="_blank" rel="noreferrer">
                      {t("documents.openFile")}
                    </a>
                  ) : (
                    <span className="tag">{t("documents.noFile")}</span>
                  )}
                </div>

                {canAssignDocuments ? (
                  <div className="document-assignment">
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
                ) : null}

                {item.assignments?.length ? (
                  <div className="assignment-history">
                    <strong>{labels.assignmentHistory}</strong>
                    {item.assignments.map((assignment) => (
                      <div className="assignment-history__item" key={assignment.id}>
                        <span className={`tag ${assignment.assignmentType === "execution" ? "tag--orange" : ""}`}>
                          {assignment.assignmentType === "execution" ? labels.execution : labels.review}
                        </span>
                        <p>
                          {labels.assignedBy}: {assignment.senderName} · {labels.assignedTo}:{" "}
                          {assignment.recipientName}
                        </p>
                        {assignment.comment ? <p>{assignment.comment}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <EmptyState title={t("documents.noDocuments")} text={t("documents.noDocumentsText")} />
        )}
        {assignmentMessage ? <p className="form-success">{assignmentMessage}</p> : null}
      </section>
    </div>
  );
}
