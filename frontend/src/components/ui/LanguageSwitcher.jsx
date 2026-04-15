import { useLanguage } from "../../context/LanguageContext";

const options = [
  { code: "ky", label: "KG" },
  { code: "ru", label: "RU" },
];

export function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`language-switcher${compact ? " language-switcher--compact" : ""}`}>
      {options.map((option) => (
        <button
          key={option.code}
          type="button"
          className={
            language === option.code
              ? "language-switcher__button language-switcher__button--active"
              : "language-switcher__button"
          }
          onClick={() => setLanguage(option.code)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
