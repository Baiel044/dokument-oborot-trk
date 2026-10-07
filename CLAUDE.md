# EduFlow TRK — Таш-Көмүр аймактык колледжинин электрондук документ жүгүртүү системасы

Колледж үчүн **реалдуу** долбоор, интернетте иштеп турат. Ар бир өзгөртүү колдонуучулардын маалыматына таасир этиши мүмкүн экенин эске алыңыз.

- Сайт: https://iwin.edu.kg (запастагы дарек: https://dokument-oborot-trk.vercel.app)
- Backend: https://dokument-oborot-trk-production.up.railway.app (`/api/health` → `{"status":"ok"}`)
- Репо: `Baiel044/dokument-oborot-trk`, негизги branch'ы `main`. Колдонуучу GitHub'да collaborator катары `Nabiev005` аккаунту менен иштейт.
- Техникалык тапшырма: `ТЗ/ТЗ_обновленное_система_документооборота.md`
- Колдонуучу менен кыргызча сүйлөшүлөт. Интерфейс кыргызча жана орусча (KG/RU), backend'дин ката билдирүүлөрү көбүнчө кыргызча.

## Стек
- **Frontend:** React 18, Vite 5, React Router 6, `lucide-react` иконкалары, жөнөкөй CSS (`frontend/src/styles.css`). Tailwind же UI китепкана колдонулбайт.
- **Backend:** Node.js `>=22.13` (локалдуу жана Railway'де 24), Express 4, JWT, bcryptjs, multer, pdf-lib.
- **База:** SQLite, Node'дун курулган `node:sqlite` модулу аркылуу. Кошумча пакет керек эмес.
- **Реалдуу убакыт:** WebSocket (`/api/messages/ws`).

## Долбоордун түзүлүшү
```text
backend/
  src/
    app.js, server.js        Express колдонмосу; сервер иштеп баштаганда backup графиги да күйөт
    data/store.js            Сактоо катмары: SQLite + in-memory кэш (төмөнкү эрежелерди караңыз)
    data/backup.js           Автоматтык жана колго backup (`npm run backup`)
    data/restore.js          Backup'тан калыбына келтирүү (`npm --prefix backend run restore -- <файл>`)
    middleware/auth.js       authenticate / authorize
    realtime/                WebSocket, билдирмелер хабы
    routes/                  auth, users, documents, requests (= /api/applications), messages,
                             notifications, dashboard, reports, audit, files, meta
    utils/config.js          Бардык env өзгөрмөлөрү ушул жерде
    utils/documentNumbering.js  №тип/номер; номер базада атомдук түрдө ээленет
    utils/*Pdf.js            Расмий PDF жана фирмалык бланк
  test/*.test.js             `node --test` тесттери (store, users)
  assets/                    Фирмалык бланктын шаблону
frontend/
  src/
    components/layout/       AppShell (сайдбар + header), AuthLayout (кирүү/каттоо)
    components/ui/           StatCard, EmptyState, LanguageSwitcher
    pages/                   admin (+ CreateUserPanel), auth, dashboard, documents, messages,
                             notifications, profile, reports, requests, users
    services/api.js          fetch орогучу; `VITE_API_URL` боюнча backend'ге кайрылат
    utils/localization.js    KG/RU котормолору
    styles.css               Дизайн системасы (токендер `:root` ичинде)
  vercel.json                Vercel: SPA rewrites, кэш
railway.json                 Railway: backend'ди гана курат жана иштетет
DEPLOY.md                    Railway + Vercel'ге коюу боюнча кадам-кадамы менен нускама (кыргызча)
README.md                    Толук сүрөттөмө (орусча)
```

## Буйруктар
```bash
npm run install:all        # backend + frontend көз карандылыктары
npm run dev:backend        # http://localhost:4000
npm run dev:frontend       # http://localhost:5173 (Vite proxy → 4000)
npm run build              # frontend/dist (backend аны өзү да бере алат)
npm test                   # backend тесттери (17 тест)
npm run backup             # колго backup (сервер токтоп турганда гана)
.\start-project.cmd        # Windows'та бир баскыч менен иштетүү
```

## Сактоо катмары: милдеттүү эрежелер
- Роуттар `const db = readDb(); ...өзгөртүү...; writeDb(db);` үлгүсүн колдонот. `writeDb` бүт базаны кайра жазбайт: `readDb` учурундагы абал менен салыштырып, **ушул суроо өзгөрткөн жазууларды гана** бир транзакцияда сактайт. Ошентип параллель суроолор бири-биринин өзгөртүүсүн өчүрбөйт.
- Ар бир жазуунун `id` талаасы болушу керек. Жаңы жазуулар `createId(prefix)` менен түзүлөт.
- Массивдин тартиби сакталат: `unshift` → башына, `push` → аягына. Массивди `sort` кылып кайра ыйгаруу тартипти **өзгөртпөйт**.
- Объект түрүндөгү маалымат `meta` таблицасында сакталат. `documentCounters` эч качан азайбайт (max-merge).
- Документ номерин `createDocumentNumber` аркылуу гана алыңыз. Ал номерди базада ошол замат ээлейт.
- Бир маалымат папкасын бир гана сервер процесси колдоно алат (`locking_mode=EXCLUSIVE`). Экинчи процесс `DATABASE_LOCKED` катасы менен токтойт.
- Production'до бош базага демо колдонуучулар түзүлбөйт: `ADMIN_*` өзгөрмөлөрүнөн бир гана администратор түзүлөт. Development'те демо колдонуучулар бар (`admin/admin123`, `director/director123`, `teacher/teacher123` ж.б.).
- Эски `data/db.json` файлы бар болсо, биринчи иштетүүдө SQLite'ка автоматтык көчүрүлөт, андан кийин `db.json.migrated-<дата>` деп атын өзгөртөт.

## ⚠️ Текшерүү жана тестирлөө эрежеси
- **Эч качан** backend кодун (жада калса `node -e "require('./src/app')"` да) чыныгы `backend/data` папкасына каршы иштетпеңиз. Мурун ушундан улам колдонуучунун `db.json` файлы кокустан SQLite'ка көчүрүлүп кеткен. Ар дайым убактылуу папканы колдонуңуз: `DATA_DIR=<temp>/data UPLOAD_DIR=<temp>/uploads`.
- `backend/data/` жана `backend/uploads/` git'ке кошулбайт.
- Колдонуучунун компьютеринде 4000-портто өз сервери иштеп турушу мүмкүн. Аны өчүрбөңүз; тест үчүн башка порт колдонуңуз (4010, 4020, 4030 ж.б.).
- Git Bash'те `/`-дан башталган аргументтер Windows жолуна айланып кетет. Мындай учурда `MSYS_NO_PATHCONV=1` колдонуңуз.

## Env өзгөрмөлөрү (backend)
| Аты | Түшүндүрмө |
|---|---|
| `NODE_ENV=production` | Production режими |
| `JWT_SECRET` | Production'до милдеттүү, кеминде 32 белги. Жок болсо, сервер иштебей токтойт |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Бош production базасындагы биринчи администратор (сырсөз ≥10 белги) |
| `DATA_DIR`, `UPLOAD_DIR`, `BACKUP_DIR` | База, файлдар жана backup'тардын папкалары |
| `BACKUP_INTERVAL_HOURS` (24), `BACKUP_KEEP` (14) | Backup графиги жана канча көчүрмө сакталары |
| `CORS_ORIGIN` | Үтүр менен бөлүнгөн тизме. `https://*-x.vercel.app` сыяктуу wildcard колдоого алынат |
| `TRUST_PROXY` | Production'до демейки `1` (Railway прокси) |
| `DB_LOCK_TIMEOUT_MS` | Redeploy учурунда мурунку процесстин базаны бошотушун канча күтүү керек |

Frontend: `VITE_API_URL` (бош болсо, ошол эле origin колдонулат). Бул маани **build учурунда** кодго кошулат, ошондуктан өзгөргөндөн кийин Vercel'де Redeploy керек.

## Интернетке коюлушу (2026-10-07)
- **Vercel** (frontend): долбоор `dokument-oborot-trk`, команда `ainabi` (Hobby), Root Directory `frontend`, `VITE_API_URL=https://dokument-oborot-trk-production.up.railway.app`.
- **Railway** (backend): долбоор `humorous-smile`, сервис `dokument-oborot-trk`, Volume `/data` (500 MB), `DATA_DIR=/data/db`, `UPLOAD_DIR=/data/uploads`. Railway'дин 30 күндүк же $5 сыноо мөөнөтү колдонулууда.
- **Домен:** `iwin.edu.kg` cctld.kg'де (Азияинфо) катталган, 23.06.2027 чейин төлөнгөн. NS-серверлер `ns1/ns2.vercel-dns.com`, DNS Vercel'де башкарылат. cctld.kg'нин акы төлөнүүчү «Услуга DNS» кызматы керек эмес.
- `main`'ге push кылынган ар бир өзгөртүү Vercel'де жана Railway'де автоматтык түрдө deploy болот.

## Жасалган иштер (хронология)
1. **Долбоорду талдоо:** коопсуздук, сактоо, тесттер жана ТЗ менен дал келүүсү боюнча кемчиликтер табылды.
2. **Дизайн толук жаңыланды** (PR #1): `business.ainabi.site` стилиндеги дизайн системасы, Inter шрифти, lucide иконкалары. Жаңы AppShell, кирүү/каттоо беттери, Dashboard. Жасалма сандар жана аттар алынды. 9707 саптык эски CSS таза дизайн системасына алмаштырылды.
3. **SQLite жана backup** (PR #1): JSON ордуна SQLite, record-деңгээлинде merge, документ номерлерин атомдук ээлөө, күн сайын backup, restore скрипти, тесттер.
4. **Deploy'го даярдоо** (PR #2): `railway.json`, `frontend/vercel.json`, production эрежелери (JWT_SECRET, демо колдонуучуларсыз seed), CORS wildcard, `trust proxy`, `DEPLOY.md`. `render.yaml` өчүрүлдү, анткени бекер планда туруктуу диск жок.
5. **Интернетке чыгаруу:** Vercel жана Railway туташтырылды, домен Vercel DNS'ке өткөрүлдү.
6. **API катасын оңдоо** (PR #3): сервер JSON эмес жооп бергенде түшүнүктүү ката көрсөтүлөт.
7. **Админ колдонуучу түзөт** (PR #4): `POST /api/users` (ADMIN гана, ар кандай рол, аккаунт дароо активдүү), «Колдонуучу кошуу» панели, сырсөз генератору, кирүү маалыматын бир жолу көрсөтүү. PUT учурунда рол, бөлүм жана абал текшерилет.

## Калган иштер
### Шашылыш (колдонуучунун өзү жасай турган иштери)
- [ ] Сайтка `admin` болуп кирип, **Профиль** бөлүмүнөн сырсөздү алмаштыруу.
- [ ] Railway'деги ашыкча `loving-radiance` долбоорун өчүрүү. `humorous-smile` долбооруна **тийбөө**.
- [ ] Railway'дин сыноо мөөнөтү (болжол менен 2026-11-06 чейин) бүткөнгө чейин **Hobby** тарифине өтүү, ансыз сайт токтойт.
- [ ] `iwin.edu.kg` доменин 23.06.2027 чейин cctld.kg'де узартуу.
- [ ] `backend/data/backups` (Railway'де `/data/db/backups`) папкасын маал-маалы менен башка жерге көчүрүп туруу.

### Коопсуздук
- [ ] Логин үчүн rate limit (`express-rate-limit`): бир IP'ден тандап сырсөз табууга тоскоол.
- [ ] `helmet` коопсуздук header'лери.
- [ ] Production'до `isLocalNetworkOrigin` (192.168.*, 10.* ж.б.) аркылуу CORS уруксатын өчүрүү.
- [ ] Каттоодо (`/api/auth/register`) сырсөз азыр кеминде 6 белги. Аны 8 белгиге көтөрүү.
- [ ] «Сырсөздү унуттум» азыр админге билдирме гана жөнөтөт. Email аркылуу калыбына келтирүү жок.

### Инфраструктура
- [ ] `api.iwin.edu.kg` → Railway Custom Domain (Vercel DNS'ке CNAME жазуусу), андан кийин `VITE_API_URL` жана `CORS_ORIGIN` маанилерин жаңыртуу.
- [ ] Railway Volume'дун өзүнүн backup'тарын күйгүзүү.

### Код сапаты
- [ ] Чоң файлдарды майда бөлүктөргө бөлүү: `DocumentsPage.jsx` (1349 сап), `RequestsPage.jsx` (1148), `routes/documents.js` (1196), `routes/requests.js` (918).
- [ ] Документ жана арыз workflow'су, номерлөө жана файлга кирүү укугу үчүн тесттер жазуу.
- [ ] `localization.js` жана беттердеги `copyByLanguage` котормолорун бир жерге чогултуу.

### Каалоо боюнча
- [ ] Түнкү тема (dark mode), токендер буга даяр.
- [ ] Toast-билдирмелер («Сакталды», «Жөнөтүлдү»).

## Иштөө тартиби
- Өзгөртүүлөр өзүнчө branch'та жасалат → push → GitHub'да PR → колдонуучу Merge басат.
- Commit билдирүүлөрү англисче, conventional стилинде (`feat:`, `fix:`, `docs:`).
- Колдонуучу өзү сурамайынча `main`'ге түз push кылынбайт.
- Интерфейске жаңы текст кошулса, KG жана RU котормолору экөө тең болушу керек.
