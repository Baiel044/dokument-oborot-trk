import { Globe } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

const options = [
  { code: "ky", label: "KG" },
  { code: "ru", label: "RU" },
];

export function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`lang-switcher${compact ? " lang-switcher--compact" : ""}`}>
      <Globe className="lang-switcher-icon" size={14} aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.code}
          type="button"
          className={language === option.code ? "lang-switcher-btn active" : "lang-switcher-btn"}
          onClick={() => setLanguage(option.code)}
          aria-pressed={language === option.code}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
