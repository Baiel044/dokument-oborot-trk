import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircleCheck, CircleX, Loader2, Search } from "lucide-react";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../services/api";
import { getLocale, translateRequestType } from "../../utils/localization";

const COPY = {
  ky: {
    title: "Документти текшерүү",
    subtitle: "PDF'теги QR-кодду сканерлеңиз же штамптын астындагы ЭЦП кодун жазыңыз.",
    codeLabel: "ЭЦП коду",
    check: "Текшерүү",
    valid: "Документ чыныгы",
    validText: "Бул документке колледждин директору электрондук кол койгон.",
    invalid: "Документ табылган жок",
    invalidText: "Бул код менен кол коюлган документ жок. Кодду туура жазганыңызды текшериңиз.",
    error: "Текшерүү мүмкүн болгон жок. Бир аздан кийин кайра аракет кылыңыз.",
    number: "Номери",
    heading: "Документ",
    documentTitle: "Аталышы",
    type: "Кайрылуунун түрү",
    author: "Автору",
    signedBy: "Кол койгон",
    signedAt: "Кол коюлган убакыт",
  },
  ru: {
    title: "Проверка документа",
    subtitle: "Отсканируйте QR-код с PDF или введите код ЭЦП под печатью.",
    codeLabel: "Код ЭЦП",
    check: "Проверить",
    valid: "Документ подлинный",
    validText: "Документ подписан электронной подписью директора колледжа.",
    invalid: "Документ не найден",
    invalidText: "Подписанного документа с таким кодом нет. Проверьте, правильно ли введён код.",
    error: "Не удалось проверить. Попробуйте ещё раз чуть позже.",
    number: "Номер",
    heading: "Документ",
    documentTitle: "Название",
    type: "Тип обращения",
    author: "Автор",
    signedBy: "Подписал",
    signedAt: "Время подписи",
  },
};

/** Public page opened by the QR code of an official PDF; no sign-in needed. */
export function VerifyPage() {
  const { code: codeParam = "" } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const copy = COPY[language] || COPY.ky;
  const [code, setCode] = useState(codeParam);
  const [state, setState] = useState({ status: codeParam ? "loading" : "idle", document: null });

  useEffect(() => {
    setCode(codeParam);
    if (!codeParam) {
      setState({ status: "idle", document: null });
      return;
    }

    let cancelled = false;
    setState({ status: "loading", document: null });
    api
      .get(`/api/verify/${encodeURIComponent(codeParam)}`)
      .then((data) => !cancelled && setState({ status: "valid", document: data.document }))
      .catch((error) => !cancelled && setState({ status: error.status === 404 ? "invalid" : "error", document: null }));
    return () => {
      cancelled = true;
    };
  }, [codeParam]);

  function handleSubmit(event) {
    event.preventDefault();
    const value = code.trim().toUpperCase();
    if (value) {
      navigate(`/verify/${encodeURIComponent(value)}`);
    }
  }

  const { document } = state;
  const rows = document
    ? [
        [copy.number, document.documentNumber],
        [copy.heading, document.heading],
        [copy.documentTitle, document.documentTitle],
        [copy.type, translateRequestType(document.type, language)],
        [copy.author, document.author],
        [copy.signedBy, document.signedBy],
        // College time, the same as on the PDF, wherever the reader is.
        [
          copy.signedAt,
          document.signedAt
            ? new Date(document.signedAt).toLocaleString(getLocale(language), {
                timeZone: "Asia/Bishkek",
                dateStyle: "short",
                timeStyle: "short",
              })
            : "",
        ],
      ].filter(([, value]) => value)
    : [];

  return (
    <AuthLayout>
      <div className="auth-heading">
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">{copy.codeLabel}</span>
          <input
            className="input verify-code-input"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="108C03CEAB2AE8EF"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={state.status === "loading"}>
          {state.status === "loading" ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
          {copy.check}
        </button>
      </form>

      {state.status === "valid" ? (
        <section className="verify-result verify-result--valid" aria-live="polite">
          <h3>
            <CircleCheck size={22} aria-hidden="true" />
            {copy.valid}
          </h3>
          <p>{copy.validText}</p>
          <dl>
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {state.status === "invalid" || state.status === "error" ? (
        <section className="verify-result verify-result--invalid" aria-live="polite">
          <h3>
            <CircleX size={22} aria-hidden="true" />
            {state.status === "invalid" ? copy.invalid : copy.error}
          </h3>
          {state.status === "invalid" ? <p>{copy.invalidText}</p> : null}
        </section>
      ) : null}
    </AuthLayout>
  );
}
