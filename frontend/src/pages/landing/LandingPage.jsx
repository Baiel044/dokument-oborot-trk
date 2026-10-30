import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  Hash,
  History,
  Leaf,
  LogIn,
  MapPin,
  MessagesSquare,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Stamp,
  UserPlus,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { LanguageSwitcher } from "../../components/ui/LanguageSwitcher";

const copyByLanguage = {
  ky: {
    brand: "EduFlow TRK",
    college: "Таш-Көмүр аймактык колледжи",
    nav: { why: "Эмне үчүн", features: "Мүмкүнчүлүктөр", how: "Кантип иштейт", roles: "Ролдор", faq: "Суроолор" },
    login: "Кирүү",
    register: "Катталуу",
    heroBadge: "Колледждин расмий электрондук документ жүгүртүү системасы",
    heroTitle: "Арыздар жана документтер — кагазсыз, кезексиз, бир жерде",
    heroSubtitle:
      "Кызматкерлер арызды онлайн жазат, директор бир баскыч менен ЭЦП коёт, ал эми система фирмалык бланкта расмий PDF даярдайт.",
    heroPrimary: "Системага кирүү",
    heroSecondary: "Кантип иштейт?",
    preview: {
      type: "Тип документа",
      typeValue: "Заявление",
      number: "Регистрационный номер",
      topic: "Тема документа",
      topicValue: "Өргүүгө арыз",
      stamp: "ЭЦП менен бекитилди",
      steps: ["Арыз жөнөтүлдү", "Директордо", "Кол коюлду"],
    },
    whyTitle: "Эмне үчүн керек",
    whySubtitle: "Кагаз менен иштөөдөгү күнүмдүк көйгөйлөрдү чечет.",
    why: [
      { icon: Clock, title: "Убакытты үнөмдөйт", text: "Арыз көтөрүп кабинеттен кабинетке басуунун кереги жок. Баары онлайн, бир нече мүнөттө." },
      { icon: Eye, title: "Ачык-айкын", text: "Документ азыр кимде турганы жана кандай абалда экени ар дайым көрүнүп турат." },
      { icon: Search, title: "Тез табылат", text: "Бардык документтер номери, аталышы жана автору боюнча бир архивде изделет." },
      { icon: Leaf, title: "Кагазсыз", text: "Басып чыгаруу азаят, документтер жоголбойт жана бузулбайт." },
    ],
    featuresTitle: "Мүмкүнчүлүктөр",
    featuresSubtitle: "Колледждин күнүмдүк документ иштерине керектүүнүн баары.",
    features: [
      { icon: Send, title: "Онлайн арыздар", text: "Өргүү, жумуштан суранып чыгуу, сабак алмаштыруу, кызматтык кат жана жүйөлүү себеп боюнча арыздар." },
      { icon: Stamp, title: "Директордун ЭЦП'си", text: "Директор арызды бекитет, кайтарат же четке кагат. Бекитилгенде санариптик кол коюлат." },
      { icon: FileCheck2, title: "Фирмалык бланкта PDF", text: "Бекитилген документ колледждин бланкында расмий PDF болуп автоматтык түрдө түзүлөт." },
      { icon: Hash, title: "Автоматтык номерлөө", text: "Ар бир документке катталуу номери (мисалы, №1/4) өзү ыйгарылат, номерлер кайталанбайт." },
      { icon: MessagesSquare, title: "Ички кабарлар", text: "Кызматкерлер ортосундагы жеке кабарлар реалдуу убакытта. Аларды ээлеринен башка эч ким окуй албайт." },
      { icon: Bell, title: "Билдирмелер", text: "Арыз бекитилгенде, кайтарылганда же жаңы тапшырма келгенде дароо билдирме келет." },
      { icon: BarChart3, title: "Отчёттор", text: "Документтер жана арыздар боюнча статистика, Excel үчүн CSV экспорт." },
      { icon: History, title: "Аракеттер журналы", text: "Ким, качан, эмне кылганы жазылып турат. Документтин толук маршрут тарыхы сакталат." },
    ],
    howTitle: "Кантип иштейт",
    howSubtitle: "Арыздан расмий документке чейин — 4 кадам.",
    steps: [
      { title: "Аккаунт алыңыз", text: "Сайтта катталыңыз. Администратор аккаунтуңузду ырастайт же сизге өзү ачып берет." },
      { title: "Арыз жазыңыз", text: "«Арыздар» бөлүмүнөн түрүн тандап, мөөнөтүн жана себебин жазып, жөнөтүңүз." },
      { title: "Директор карайт", text: "Директор арызды бекитет же түшүндүрмө менен кайтарат. Сизге билдирме келет." },
      { title: "Расмий PDF алыңыз", text: "Бекитилген арыз фирмалык бланкта ЭЦП коду менен PDF болуп чыгат. Аны ачып, жүктөп же басып алсаңыз болот." },
    ],
    rolesTitle: "Ким эмне кылат",
    rolesSubtitle: "Ар бир колдонуучу өз ролуна жараша керектүү бөлүмдөрдү гана көрөт.",
    roles: [
      { title: "Окутуучу", text: "Арыз жазат, документ жүктөйт, абалын көзөмөлдөйт, кабар жазышат." },
      { title: "Директор", text: "Арыздарды жана документтерди бекитет, ЭЦП коёт, тапшырма берет." },
      { title: "Окуу бөлүмү", text: "Окуу процессине тиешелүү документтер жана отчёттор менен иштейт." },
      { title: "Кадрлар бөлүмү", text: "Кызматкерлердин тизмесин жүргүзөт, кадрдык документтерди иштетет." },
      { title: "Бухгалтерия", text: "Каржылык документтерди жана отчётторду карайт." },
      { title: "Администратор", text: "Колдонуучуларды кошот жана ырастайт, фирмалык бланкты жаңыртат, журналды көрөт." },
    ],
    faqTitle: "Көп берилүүчү суроолор",
    faq: [
      { q: "Аккаунтту кантип алам?", a: "«Катталуу» баскычын басып, маалыматыңызды толтуруңуз. Администратор ырастагандан кийин кире аласыз. Же администратор сизге аккаунт ачып, логин менен сырсөз берет." },
      { q: "Сырсөздү унутуп калсам эмне кылам?", a: "Колледждин системалык администраторуна кайрылыңыз, ал жаңы сырсөз коюп берет." },
      { q: "Расмий PDF кагаз документтин ордуна жүрөбү?", a: "PDF колледждин фирмалык бланкында түзүлүп, директордун ЭЦП коду жана катталуу номери менен чыгат. Керек болсо, аны басып чыгарып колдонсоңуз болот." },
      { q: "Телефондон иштесе болобу?", a: "Ооба. Сайт телефондо да, компьютерде да ачылат, атайын тиркеме орнотуунун кереги жок." },
      { q: "Маалыматым коопсузбу?", a: "Кирүү сырсөз жана ролдор менен корголгон. Жеке кабарларды ээлеринен башка эч ким окуй албайт. База күн сайын автоматтык түрдө сакталат (backup)." },
    ],
    ctaTitle: "Баштоого даярсызбы?",
    ctaText: "Системага кирип, биринчи арызыңызды бир нече мүнөттө жөнөтүңүз.",
    address: "715430, Жалал-Абад обл., Таш-Көмүр ш., Студенттер көч., №5",
    phone: "Тел.: 0771 528 222",
    site: "www.trk.kg",
    footer: "Электрондук документ жүгүртүүнүн расмий системасы",
  },
  ru: {
    brand: "EduFlow TRK",
    college: "Таш-Кумырский региональный колледж",
    nav: { why: "Зачем", features: "Возможности", how: "Как работает", roles: "Роли", faq: "Вопросы" },
    login: "Войти",
    register: "Регистрация",
    heroBadge: "Официальная система электронного документооборота колледжа",
    heroTitle: "Заявления и документы — без бумаги, без очередей, в одном месте",
    heroSubtitle:
      "Сотрудники подают заявления онлайн, директор подписывает их ЭЦП в один клик, а система формирует официальный PDF на фирменном бланке.",
    heroPrimary: "Войти в систему",
    heroSecondary: "Как это работает?",
    preview: {
      type: "Тип документа",
      typeValue: "Заявление",
      number: "Регистрационный номер",
      topic: "Тема документа",
      topicValue: "Заявление на отпуск",
      stamp: "Подписано ЭЦП",
      steps: ["Заявление отправлено", "У директора", "Подписано"],
    },
    whyTitle: "Зачем это нужно",
    whySubtitle: "Система решает повседневные проблемы бумажного документооборота.",
    why: [
      { icon: Clock, title: "Экономит время", text: "Не нужно носить заявление по кабинетам. Всё онлайн, за несколько минут." },
      { icon: Eye, title: "Прозрачность", text: "Всегда видно, у кого сейчас документ и в каком он статусе." },
      { icon: Search, title: "Быстрый поиск", text: "Все документы в одном архиве: поиск по номеру, названию и автору." },
      { icon: Leaf, title: "Без бумаги", text: "Меньше печати, документы не теряются и не портятся." },
    ],
    featuresTitle: "Возможности",
    featuresSubtitle: "Всё необходимое для ежедневной работы с документами колледжа.",
    features: [
      { icon: Send, title: "Онлайн-заявления", text: "Отпуск, отгул, замена занятий, служебная записка и заявления по уважительной причине." },
      { icon: Stamp, title: "ЭЦП директора", text: "Директор утверждает, возвращает или отклоняет заявление. При утверждении ставится цифровая подпись." },
      { icon: FileCheck2, title: "PDF на фирменном бланке", text: "Утверждённый документ автоматически оформляется как официальный PDF на бланке колледжа." },
      { icon: Hash, title: "Автонумерация", text: "Каждому документу присваивается регистрационный номер (например, №1/4), номера не повторяются." },
      { icon: MessagesSquare, title: "Внутренние сообщения", text: "Личная переписка сотрудников в реальном времени. Её не может прочитать никто, кроме участников." },
      { icon: Bell, title: "Уведомления", text: "Мгновенные уведомления об утверждении, возврате заявления или новом поручении." },
      { icon: BarChart3, title: "Отчёты", text: "Статистика по документам и заявлениям, экспорт в CSV для Excel." },
      { icon: History, title: "Журнал действий", text: "Фиксируется, кто, когда и что сделал. Сохраняется полная история маршрута документа." },
    ],
    howTitle: "Как это работает",
    howSubtitle: "От заявления до официального документа — 4 шага.",
    steps: [
      { title: "Получите аккаунт", text: "Зарегистрируйтесь на сайте. Администратор подтвердит аккаунт или создаст его для вас сам." },
      { title: "Подайте заявление", text: "В разделе «Заявления» выберите тип, укажите период и причину и отправьте." },
      { title: "Директор рассматривает", text: "Директор утверждает заявление или возвращает его с комментарием. Вы получите уведомление." },
      { title: "Получите официальный PDF", text: "Утверждённое заявление оформляется в PDF на фирменном бланке с кодом ЭЦП. Его можно открыть, скачать или распечатать." },
    ],
    rolesTitle: "Кто что делает",
    rolesSubtitle: "Каждый пользователь видит только нужные ему разделы в зависимости от роли.",
    roles: [
      { title: "Преподаватель", text: "Подаёт заявления, загружает документы, следит за статусом, переписывается." },
      { title: "Директор", text: "Утверждает заявления и документы, ставит ЭЦП, даёт поручения." },
      { title: "Учебная часть", text: "Работает с документами и отчётами по учебному процессу." },
      { title: "Отдел кадров", text: "Ведёт список сотрудников, обрабатывает кадровые документы." },
      { title: "Бухгалтерия", text: "Работает с финансовыми документами и отчётами." },
      { title: "Администратор", text: "Добавляет и подтверждает пользователей, обновляет фирменный бланк, просматривает журнал." },
    ],
    faqTitle: "Частые вопросы",
    faq: [
      { q: "Как получить аккаунт?", a: "Нажмите «Регистрация» и заполните данные. После подтверждения администратором вы сможете войти. Либо администратор создаст аккаунт и выдаст логин и пароль." },
      { q: "Что делать, если забыл пароль?", a: "Обратитесь к системному администратору колледжа, он установит новый пароль." },
      { q: "Заменяет ли официальный PDF бумажный документ?", a: "PDF формируется на фирменном бланке колледжа с кодом ЭЦП директора и регистрационным номером. При необходимости его можно распечатать." },
      { q: "Можно ли работать с телефона?", a: "Да. Сайт открывается и на телефоне, и на компьютере, устанавливать приложение не нужно." },
      { q: "Мои данные в безопасности?", a: "Вход защищён паролем и ролями. Личные сообщения доступны только участникам переписки. База автоматически копируется каждый день (backup)." },
    ],
    ctaTitle: "Готовы начать?",
    ctaText: "Войдите в систему и отправьте первое заявление за несколько минут.",
    address: "715430, Жалал-Абадская обл., г. Таш-Кумыр, ул. Студенческая, №5",
    phone: "Тел.: 0771 528 222",
    site: "www.trk.kg",
    footer: "Официальная система электронного документооборота",
  },
};

function Brand({ copy }) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <Link to="/" className="landing-brand">
      <span className="sidebar-brand-mark landing-brand-mark">
        {logoFailed ? "ТРК" : <img src="/logo/college-logo.png" alt="" onError={() => setLogoFailed(true)} />}
      </span>
      <span className="sidebar-brand-text">
        <span className="sidebar-brand-name">{copy.brand}</span>
        <span className="sidebar-brand-caption">{copy.college}</span>
      </span>
    </Link>
  );
}

function DocumentPreview({ preview }) {
  return (
    <div className="landing-preview" aria-hidden="true">
      <div className="landing-sheet">
        <div className="landing-sheet-head">
          <span className="landing-sheet-lines">
            <i />
            <i />
            <i />
          </span>
          <img src="/logo/college-logo.png" alt="" />
          <span className="landing-sheet-lines">
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="landing-sheet-rule" />
        <dl className="landing-sheet-fields">
          <div>
            <dt>{preview.type}</dt>
            <dd>{preview.typeValue}</dd>
          </div>
          <div>
            <dt>{preview.number}</dt>
            <dd>№1/4</dd>
          </div>
          <div>
            <dt>{preview.topic}</dt>
            <dd>{preview.topicValue}</dd>
          </div>
        </dl>
        <span className="landing-sheet-stamp">
          <Stamp size={16} />
          {preview.stamp}
        </span>
      </div>

      <ol className="landing-route">
        {preview.steps.map((step, index) => (
          <li key={step} className={index === preview.steps.length - 1 ? "is-done" : ""}>
            <CheckCircle2 size={16} />
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

function SectionHead({ title, subtitle }) {
  return (
    <div className="landing-section-head">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

export function LandingPage() {
  const { language } = useLanguage();
  const copy = copyByLanguage[language] || copyByLanguage.ky;

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Brand copy={copy} />
          <nav className="landing-nav">
            {Object.entries(copy.nav).map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
          <div className="landing-header-actions">
            <LanguageSwitcher compact />
            <Link to="/login" className="btn btn-primary btn-sm">
              <LogIn size={16} />
              {copy.login}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-container landing-hero-inner">
            <div className="landing-hero-copy animate-in">
              <span className="landing-badge">
                <ShieldCheck size={14} />
                {copy.heroBadge}
              </span>
              <h1>{copy.heroTitle}</h1>
              <p>{copy.heroSubtitle}</p>
              <div className="landing-hero-actions">
                <Link to="/login" className="btn btn-primary btn-lg">
                  {copy.heroPrimary}
                  <ArrowRight size={18} />
                </Link>
                <a href="#how" className="btn btn-secondary btn-lg">
                  {copy.heroSecondary}
                </a>
              </div>
            </div>
            <DocumentPreview preview={copy.preview} />
          </div>
        </section>

        <section id="why" className="landing-section">
          <div className="landing-container">
            <SectionHead title={copy.whyTitle} subtitle={copy.whySubtitle} />
            <div className="landing-grid landing-grid--4">
              {copy.why.map(({ icon: Icon, title, text }) => (
                <article className="landing-card" key={title}>
                  <span className="landing-card-icon">
                    <Icon size={20} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="landing-section landing-section--muted">
          <div className="landing-container">
            <SectionHead title={copy.featuresTitle} subtitle={copy.featuresSubtitle} />
            <div className="landing-grid landing-grid--4">
              {copy.features.map(({ icon: Icon, title, text }) => (
                <article className="landing-card" key={title}>
                  <span className="landing-card-icon">
                    <Icon size={20} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="landing-section">
          <div className="landing-container">
            <SectionHead title={copy.howTitle} subtitle={copy.howSubtitle} />
            <ol className="landing-steps">
              {copy.steps.map(({ title, text }, index) => (
                <li key={title}>
                  <span className="landing-step-number">{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="roles" className="landing-section landing-section--muted">
          <div className="landing-container">
            <SectionHead title={copy.rolesTitle} subtitle={copy.rolesSubtitle} />
            <div className="landing-grid landing-grid--3">
              {copy.roles.map(({ title, text }) => (
                <article className="landing-role" key={title}>
                  <FileText size={18} />
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="landing-section">
          <div className="landing-container landing-faq-wrap">
            <SectionHead title={copy.faqTitle} />
            <div className="landing-faq">
              {copy.faq.map(({ q, a }) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-container">
            <div className="landing-cta">
              <div>
                <h2>{copy.ctaTitle}</h2>
                <p>{copy.ctaText}</p>
              </div>
              <div className="landing-hero-actions">
                <Link to="/login" className="btn btn-lg landing-cta-primary">
                  <LogIn size={18} />
                  {copy.login}
                </Link>
                <Link to="/register" className="btn btn-lg landing-cta-secondary">
                  <UserPlus size={18} />
                  {copy.register}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div>
            <Brand copy={copy} />
            <p>{copy.footer}</p>
          </div>
          <ul>
            <li>
              <MapPin size={16} />
              {copy.address}
            </li>
            <li>
              <Phone size={16} />
              {copy.phone}
            </li>
            <li>
              <a href="https://www.trk.kg" target="_blank" rel="noopener noreferrer">
                {copy.site}
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
