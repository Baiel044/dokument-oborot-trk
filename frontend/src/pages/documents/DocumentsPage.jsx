import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { translateDocumentCategory } from "../../utils/localization";

const DEFAULT_CATEGORY = "orders";

export function DocumentsPage() {
  const { language, t } = useLanguage();
  const labels =
    language === "ru"
      ? {
          supportedFormats: "Поддерживаются PDF, Word и Excel",
          uploadFile: "Загрузить файл",
          generateLetterhead: "Создать на фирменном бланке",
          letterheadBadge: "Фирменный бланк",
          letterheadHint: "Для фирменного бланка заполните название и описание. Файл прикладывать не нужно.",
          titleRequired: "Для создания документа на фирменном бланке укажите название документа.",
        }
      : {
          supportedFormats: "PDF, Word жана Excel файлдары колдоого алынат",
          uploadFile: "Файлды жүктөө",
          generateLetterhead: "Фирмалык бланкта түзүү",
          letterheadBadge: "Фирмалык бланк",
          letterheadHint: "Фирмалык бланк үчүн документтин аталышын жана сүрөттөмөсүн жазыңыз. Файл керек эмес.",
          titleRequired: "Фирмалык бланкта түзүү үчүн документтин аталышын жазыңыз.",
        };

  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
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
    const [documentsData, catalogs] = await Promise.all([
      api.get("/api/documents"),
      api.get("/api/meta/catalogs"),
    ]);

    setDocuments(documentsData.documents);
    setCategories(catalogs.documentCategories || []);
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

      <section className="panel">
        <div className="panel__header">
          <h3>{t("documents.archive")}</h3>
        </div>
        {documents.length ? (
          documents.map((item) => (
            <div className="document-row" key={item.id}>
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
          ))
        ) : (
          <EmptyState title={t("documents.noDocuments")} text={t("documents.noDocumentsText")} />
        )}
      </section>
    </div>
  );
}
