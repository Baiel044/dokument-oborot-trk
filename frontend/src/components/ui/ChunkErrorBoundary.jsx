import { Component } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";

const copyByLanguage = {
  ky: {
    title: "Баракча жүктөлгөн жок",
    text: "Интернет байланышын текшерип, баракчаны кайра жүктөңүз.",
    reload: "Кайра жүктөө",
    login: "Системага кирүү",
  },
  ru: {
    title: "Страница не загрузилась",
    text: "Проверьте подключение к интернету и обновите страницу.",
    reload: "Обновить",
    login: "Войти в систему",
  },
};

function ChunkErrorMessage() {
  const { language } = useLanguage();
  const copy = copyByLanguage[language] || copyByLanguage.ky;

  return (
    <div className="page-loader chunk-error">
      <strong>{copy.title}</strong>
      <span>{copy.text}</span>
      <div className="chunk-error-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {copy.reload}
        </button>
        <Link to="/login" className="btn btn-secondary">
          {copy.login}
        </Link>
      </div>
    </div>
  );
}

/** Shows a friendly message instead of a blank page when a lazy-loaded page fails to load. */
export class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <ChunkErrorMessage /> : this.props.children;
  }
}
