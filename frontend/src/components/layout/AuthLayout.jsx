import { useState } from "react";
import { FileCheck2, MessagesSquare, ShieldCheck } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";

const copyByLanguage = {
  ru: {
    brand: "EduFlow TRK",
    college: "Таш-Кумырский региональный колледж",
    title: "Документооборот колледжа в одном месте",
    subtitle:
      "Заявления, согласование директором, официальные PDF на фирменном бланке, сообщения и уведомления — без бумаги.",
    features: [
      { icon: ShieldCheck, title: "Ролевой доступ", text: "Каждый отдел видит только свои документы" },
      { icon: FileCheck2, title: "Онлайн-согласование", text: "Подпись директора и автоматический PDF" },
      { icon: MessagesSquare, title: "Внутренняя связь", text: "Сообщения и уведомления в реальном времени" },
    ],
    footer: "Официальная система электронного документооборота",
  },
  ky: {
    brand: "EduFlow TRK",
    college: "Таш-Көмүр аймактык колледжи",
    title: "Колледждин документ жүгүртүүсү бир жерде",
    subtitle:
      "Арыздар, директордун макулдашуусу, фирмалык бланктагы расмий PDF, кабарлар жана билдирмелер — кагазсыз.",
    features: [
      { icon: ShieldCheck, title: "Ролдор боюнча кирүү", text: "Ар бир бөлүм өз документтерин гана көрөт" },
      { icon: FileCheck2, title: "Онлайн макулдашуу", text: "Директордун колу жана автоматтык PDF" },
      { icon: MessagesSquare, title: "Ички байланыш", text: "Кабарлар жана билдирмелер реалдуу убакытта" },
    ],
    footer: "Электрондук документ жүгүртүүнүн расмий системасы",
  },
};

export function AuthLayout({ children, wide = false }) {
  const { language } = useLanguage();
  const [logoFailed, setLogoFailed] = useState(false);
  const copy = copyByLanguage[language] || copyByLanguage.ky;

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-aside-brand">
          <span className="sidebar-brand-mark auth-aside-mark">
            {logoFailed ? "ТРК" : <img src="/logo/college-logo.png" alt="" onError={() => setLogoFailed(true)} />}
          </span>
          <span className="sidebar-brand-text">
            <span className="sidebar-brand-name">{copy.brand}</span>
            <span className="sidebar-brand-caption">{copy.college}</span>
          </span>
        </div>

        <div className="auth-aside-body">
          <h1 className="auth-aside-title">{copy.title}</h1>
          <p className="auth-aside-subtitle">{copy.subtitle}</p>
          <ul className="auth-feature-list stagger-in">
            {copy.features.map(({ icon: Icon, title, text }) => (
              <li className="auth-feature" key={title}>
                <span className="auth-feature-icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth-aside-footer">{copy.footer}</p>
      </aside>

      <main className="auth-main">
        <div className="auth-main-top">
          <LanguageSwitcher compact />
        </div>
        <div className={wide ? "auth-panel auth-panel--wide animate-in" : "auth-panel animate-in"}>{children}</div>
      </main>
    </div>
  );
}
