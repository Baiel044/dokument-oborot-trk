import { useLanguage } from "../../context/LanguageContext";
import { translateDocumentCategory } from "../../utils/localization";

const COPY = {
  ky: {
    title: "Санариптик архив",
    showAll: "Бардык документтер",
    files: { other: "файл" },
    documents: { other: "документ" },
  },
  ru: {
    title: "Цифровой архив",
    showAll: "Все документы",
    files: { one: "файл", few: "файла", other: "файлов" },
    documents: { one: "документ", few: "документа", other: "документов" },
  },
};

const ruPluralRules = new Intl.PluralRules("ru");

/** "5 файлов" / "5 файл": Kyrgyz nouns keep one form after a number. */
function formatCount(count, forms, language) {
  const rule = language === "ru" ? ruPluralRules.select(count) : "other";
  return `${count} ${forms[rule] || forms.other}`;
}

/** Paper sticks out of a folder only when there is something inside. */
function FolderIllustration({ hasDocuments }) {
  return (
    <svg className="document-folder__icon" viewBox="0 0 120 92" aria-hidden="true">
      <path
        className="document-folder__back"
        d="M6 18a8 8 0 0 1 8-8h27a8 8 0 0 1 6 2.700l5.500 6.300H106a8 8 0 0 1 8 8v49a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8Z"
      />
      {hasDocuments ? (
        <g className="document-folder__paper">
          <rect x="17" y="20" width="86" height="50" rx="4" />
          <path d="M27 28h40" />
        </g>
      ) : null}
      <path
        className="document-folder__front"
        d="M4 43a8 8 0 0 1 8-9h96a8 8 0 0 1 8 9l-4.200 37a8 8 0 0 1-8 7H16.200a8 8 0 0 1-8-7Z"
      />
    </svg>
  );
}

export function DocumentFolders({ folders, total, onOpen, onShowAll }) {
  const { language } = useLanguage();
  const copy = COPY[language] || COPY.ky;

  return (
    <div className="document-folders">
      <div className="document-folders__header">
        <h2>{copy.title}</h2>
        <span className="tag tag--blue">{formatCount(total, copy.documents, language)}</span>
        <button className="ghost-button" type="button" onClick={onShowAll}>
          {copy.showAll}
        </button>
      </div>
      <ul className="document-folders__grid">
        {folders.map((folder) => (
          <li key={folder.category}>
            <button className="document-folder" type="button" onClick={() => onOpen(folder.category)}>
              <FolderIllustration hasDocuments={folder.count > 0} />
              <span className="document-folder__name">{translateDocumentCategory(folder.category, language)}</span>
              <span className="document-folder__count">{formatCount(folder.count, copy.files, language)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
