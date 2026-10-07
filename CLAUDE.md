# EduFlow TRK — Таш-Көмүр аймактык колледжинин электрондук документ жүгүртүү системасы

Колледж үчүн **реалдуу** долбоор, интернетте иштеп турат. Ар бир өзгөртүү колдонуучулардын маалыматына таасир этиши мүмкүн экенин эске алыңыз.

- Сайт: https://iwin.edu.kg (запастагы дарек: https://dokument-oborot-trk.vercel.app)
- Backend: https://dokument-oborot-trk-production.up.railway.app (`/api/health` → `{"status":"ok"}`)
- Репо: `Baiel044/dokument-oborot-trk`, негизги branch'ы `main`. Колдонуучу GitHub'да collaborator катары `Nabiev005` аккаунту менен иштейт.
- Техникалык тапшырма: `ТЗ/ТЗ_обновленное_система_документооборота.md`
- Колдонуучу менен кыргызча сүйлөшүлөт. Интерфейс кыргызча жана орусча (KG/RU), backend'дин ката билдирүүлөрү жана билдирмелери кыргызча.

## Стек
- **Frontend:** React 18, Vite 5, React Router 6, `lucide-react` иконкалары, жөнөкөй CSS (`frontend/src/styles.css`). Tailwind же UI китепкана колдонулбайт.
- **Backend:** Node.js `>=22.13` (локалдуу жана Railway'де 24), Express 4, JWT, bcryptjs, multer, pdf-lib + fontkit, `helmet`, `express-rate-limit`.
- **База:** SQLite, Node'дун курулган `node:sqlite` модулу аркылуу. Кошумча пакет керек эмес.
- **Реалдуу убакыт:** өзүбүз жазган WebSocket (`/api/messages/ws`), китепкана колдонулбайт.

## Долбоордун түзүлүшү
```text
backend/
  src/
    app.js, server.js          Express колдонмосу: helmet, CORS, rate limit; сервер иштегенде backup графиги күйөт
    data/store.js              Сактоо катмары: SQLite + in-memory кэш (төмөнкү эрежелерди караңыз)
    data/backup.js             Автоматтык жана колго backup (`npm run backup`)
    data/restore.js            Backup'тан калыбына келтирүү (`npm --prefix backend run restore -- <файл>`)
    middleware/auth.js         authenticate / authorize (токендин жарактуулугу utils/sessions.js аркылуу)
    middleware/rateLimits.js   Логин, каттоо жана сырсөздү калыбына келтирүү үчүн чектер
    middleware/uploads.js      removeUploadOnFailure: каталуу суроонун файлын дисктен өчүрөт
    realtime/messagesSocket.js WebSocket: фреймдерди буферлейт, ар бир кабарда колдонуучуну кайра текшерет
    realtime/notificationsHub.js  Жаңы билдирмелерди WebSocket'ке жеткирет
    routes/                    auth, users, documents, requests (= /api/applications), messages,
                               notifications, dashboard, reports, audit, files, meta
    utils/config.js            Бардык env өзгөрмөлөрү ушул жерде
    utils/sessions.js          isTokenCurrent: колдонуучу активдүүбү, сырсөз токенден кийин алмашпадыбы
    utils/messageValidation.js Кабардын текстин жана темасын текшерүү (REST жана WebSocket үчүн)
    utils/documentNumbering.js №тип/номер; номер базада атомдук түрдө ээленет
    utils/letterhead.js        Фирмалык бланктын шаблонунун жолу (жүктөлгөнү DATA_DIR'де)
    utils/pdfFonts.js          PDF шрифттери; адегенде долбоордогу PT Sans колдонулат
    utils/*Pdf.js              Расмий PDF, фирмалык бланк, отчёт
  assets/                      Фирмалык бланктын демейки шаблону, fonts/PT_Sans-Web-Regular.ttf (+ OFL.txt)
  test/*.test.js               `node --test`: store, users, security (жалпысынан 32 тест)
frontend/
  src/
    components/layout/         AppShell (сайдбар + header), AuthLayout (кирүү/каттоо)
    components/ui/             StatCard, EmptyState, LanguageSwitcher
    pages/                     admin (+ CreateUserPanel), auth, dashboard, documents, messages,
                               notifications, profile, reports, requests, users
    services/api.js            fetch орогучу; `VITE_API_URL` боюнча backend'ге кайрылат
    utils/localization.js      KG/RU котормолору
    styles.css                 Дизайн системасы (токендер `:root` ичинде)
  vercel.json                  Vercel: SPA rewrites, кэш
railway.json                   Railway: backend'ди гана курат жана иштетет
DEPLOY.md                      Railway + Vercel'ге коюу боюнча кадам-кадамы менен нускама (кыргызча)
README.md                      Толук сүрөттөмө (орусча)
```

## Буйруктар
```bash
npm run install:all        # backend + frontend көз карандылыктары
npm run dev:backend        # http://localhost:4000
npm run dev:frontend       # http://localhost:5173 (Vite proxy → 4000)
npm run build              # frontend/dist (backend аны өзү да бере алат)
npm test                   # backend тесттери (32 тест)
npm run backup             # колго backup (сервер токтоп турганда гана)
.\start-project.cmd        # Windows'та бир баскыч менен иштетүү
```

## Сактоо катмары: милдеттүү эрежелер
- Роуттар `const db = readDb(); ...өзгөртүү...; writeDb(db);` үлгүсүн колдонот. `writeDb` бүт базаны кайра жазбайт: `readDb` учурундагы абал менен салыштырып, **ушул суроо өзгөрткөн жазууларды гана** бир транзакцияда сактайт. Ошентип параллель суроолор бири-биринин өзгөртүүсүн өчүрбөйт.
- `writeDb` чакырылбаса, эч нерсе сакталбайт. Ошондуктан текшерүүдөн өтпөй калса, `return res.status(4xx)` менен чыгып кетүү коопсуз.
- Ар бир жазуунун `id` талаасы болушу керек. Жаңы жазуулар `createId(prefix)` менен түзүлөт.
- Массивдин тартиби сакталат: `unshift` → башына, `push` → аягына. Массивди `sort` кылып кайра ыйгаруу тартипти **өзгөртпөйт**.
- Объект түрүндөгү маалымат `meta` таблицасында сакталат. `documentCounters` эч качан азайбайт (max-merge).
- Документ номерин `createDocumentNumber` аркылуу гана алыңыз. Ал номерди базада ошол замат ээлейт.
- Бир маалымат папкасын бир гана сервер процесси колдоно алат (`locking_mode=EXCLUSIVE`). Экинчи процесс `DATABASE_LOCKED` катасы менен токтойт.
- Production'до бош базага демо колдонуучулар түзүлбөйт: `ADMIN_*` өзгөрмөлөрүнөн бир гана администратор түзүлөт. Development'те демо колдонуучулар бар (`admin/admin123`, `director/director123`, `teacher/teacher123`, `academic/academic123`, `hr/hr123456`, `accountant/account123`).
- Эски `data/db.json` файлы бар болсо, биринчи иштетүүдө SQLite'ка автоматтык көчүрүлөт, андан кийин `db.json.migrated-<дата>` деп атын өзгөртөт. Колдонуучунун компьютеринде бул көчүрүү 2026-10-07де болуп өттү.

## Коопсуздук эрежелери (бузбаңыз)
- **Токендер:** `utils/sessions.js` → `isTokenCurrent`. Колдонуучу бөгөттөлсө, өчүрүлсө же сырсөзү алмашса (`passwordChangedAt`), эски токендер жараксыз болот. Сырсөз алмаштырган колдонуучунун өзүнө `PUT /api/users/me/password` жаңы токен кайтарат.
- **WebSocket:** колдонуучу ар бир кирген кабарда жана ар бир жеткирүүдө кайра текшерилет. Бир кабар 64 KB'дан ашпайт.
- **Файл жүктөө:** укук multer'ге **чейин** текшерилет. Жүктөө роуттарында `removeUploadOnFailure` multer'ден мурун турат.
- **Документ өчүрүү:** бекитилген же расмий документти директор/админ гана өчүрө алат. Файлдар `removeUnreferencedFiles` аркылуу өчүрүлөт, башка документ же арыз колдонуп жаткан файлга тийилбейт.
- **Расмий PDF:** директор же админ тарабынан, `approved` же `completed` абалындагы документ үчүн гана түзүлөт.
- **CSV экспорт:** `escapeCsvValue` формула белгилерин (`= + - @`) коргойт. Жаңы CSV түзсөңүз, ушул функцияны колдонуңуз.
- **Журналдагы IP:** `req.ip` гана колдонулат (`trust proxy` аркылуу). `X-Forwarded-For` header'ин түз окубаңыз.
- **Жеке кабарлар:** ээлеринен башка эч ким, админ менен директор да окуй албайт.
- **Сырсөздөр:** кеминде 8 белги (каттоо, админ коюп берген жана өзү алмаштырган сырсөз).
- **CORS:** production'до `CORS_ORIGIN` тизмеси гана. Жергиликтүү тармак (192.168.* ж.б.) development'те гана уруксат.
- **Кирүү:** аккаунттун абалы туура сырсөз жазылгандан кийин гана айтылат. 15 мүнөттө 10 ийгиликсиз аракеттен кийин 429 катасы кайтат.

## ⚠️ Текшерүү жана тестирлөө эрежеси
- **Эч качан** backend кодун (жада калса `node -e "require('./src/app')"` да) чыныгы `backend/data` папкасына каршы иштетпеңиз. Мурун ушундан улам колдонуучунун `db.json` файлы кокустан SQLite'ка көчүрүлүп кеткен. Ар дайым убактылуу папканы колдонуңуз: `DATA_DIR=<temp>/data UPLOAD_DIR=<temp>/uploads`.
- `backend/data/` жана `backend/uploads/` git'ке кошулбайт.
- Колдонуучунун компьютеринде 4000-портто өз сервери иштеп турушу мүмкүн. Аны өчүрбөңүз; тест үчүн башка порт колдонуңуз (4010, 4020, 4030, 4040 ж.б.).
- Git Bash'те `/`-дан башталган аргументтер Windows жолуна айланып кетет. Мындай учурда `MSYS_NO_PATHCONV=1` колдонуңуз.
- Bash heredoc ичиндеги узун Python скрипттери кээде бузулат. Андай скриптти адегенде scratchpad'ка файл катары жазып, андан кийин иштетиңиз.
- Браузер аркылуу текшерүү: scratchpad'тагы `puppeteer-core` + `C:/Program Files/Google/Chrome/Application/chrome.exe`.

## Env өзгөрмөлөрү (backend)
| Аты | Түшүндүрмө |
|---|---|
| `NODE_ENV=production` | Production режими |
| `JWT_SECRET` | Production'до милдеттүү, кеминде 32 белги. Жок болсо, сервер иштебей токтойт |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Бош production базасындагы биринчи администратор (сырсөз ≥10 белги) |
| `DATA_DIR`, `UPLOAD_DIR`, `BACKUP_DIR` | База, файлдар жана backup'тардын папкалары. Жүктөлгөн фирмалык бланк `DATA_DIR/letterhead/` ичинде сакталат |
| `BACKUP_INTERVAL_HOURS` (24), `BACKUP_KEEP` (14) | Backup графиги жана канча көчүрмө сакталары |
| `CORS_ORIGIN` | Үтүр менен бөлүнгөн тизме. `https://*-x.vercel.app` сыяктуу wildcard колдоого алынат |
| `TRUST_PROXY` | Production'до демейки `1` (Railway прокси) |
| `DB_LOCK_TIMEOUT_MS` | Redeploy учурунда мурунку процесстин базаны бошотушун канча күтүү керек |

Frontend: `VITE_API_URL` (бош болсо, ошол эле origin колдонулат). Бул маани **build учурунда** кодго кошулат, ошондуктан өзгөргөндөн кийин Vercel'де Redeploy керек.

## Интернетке коюлушу (2026-10-07)
- **Vercel** (frontend): долбоор `dokument-oborot-trk`, команда `ainabi` (Hobby), Root Directory `frontend`, `VITE_API_URL=https://dokument-oborot-trk-production.up.railway.app`.
- **Railway** (backend): долбоор `humorous-smile`, сервис `dokument-oborot-trk`, Volume `/data` (500 MB), `DATA_DIR=/data/db`, `UPLOAD_DIR=/data/uploads`. Railway'дин 30 күндүк же $5 сыноо мөөнөтү колдонулууда.
- **Домен:** `iwin.edu.kg` cctld.kg'де (Азияинфо) катталган, 23.06.2027 чейин төлөнгөн. NS-серверлер `ns1/ns2.vercel-dns.com`, DNS Vercel'де башкарылат. cctld.kg'нин акы төлөнүүчү «Услуга DNS» кызматы (871 сом) керек эмес.
- `main`'ге push кылынган ар бир өзгөртүү Vercel'де жана Railway'де автоматтык түрдө deploy болот. Railway жаңы npm пакеттерин өзү орнотот.

## Жасалган иштер (хронология)
1. **Долбоорду талдоо:** коопсуздук, сактоо, тесттер жана ТЗ менен дал келүүсү боюнча кемчиликтер табылды.
2. **Дизайн толук жаңыланды** (PR #1): `business.ainabi.site` стилиндеги дизайн системасы, Inter шрифти, lucide иконкалары. Жаңы AppShell, кирүү/каттоо беттери, Dashboard. Жасалма сандар жана аттар алынды. 9707 саптык эски CSS таза дизайн системасына алмаштырылды.
3. **SQLite жана backup** (PR #1): JSON ордуна SQLite, record-деңгээлинде merge, документ номерлерин атомдук ээлөө, күн сайын backup, restore скрипти, тесттер.
4. **Deploy'го даярдоо** (PR #2): `railway.json`, `frontend/vercel.json`, production эрежелери (JWT_SECRET, демо колдонуучуларсыз seed), CORS wildcard, `trust proxy`, `DEPLOY.md`. `render.yaml` өчүрүлдү, анткени бекер планда туруктуу диск жок.
5. **Интернетке чыгаруу:** Vercel жана Railway туташтырылды, `iwin.edu.kg` домени Vercel DNS'ке өткөрүлдү.
6. **API катасын оңдоо** (PR #3): сервер JSON эмес жооп бергенде түшүнүктүү ката көрсөтүлөт.
7. **Админ колдонуучу түзөт** (PR #4): `POST /api/users` (ADMIN гана, ар кандай рол, аккаунт дароо активдүү), «Колдонуучу кошуу» панели, сырсөз генератору, кирүү маалыматын бир жолу көрсөтүү. PUT учурунда рол, бөлүм жана абал текшерилет.
8. **Коопсуздук текшерүүсү жана оңдоолор** (`fix-security-review` branch'ы, PR күтүп турат):
   - Расмий PDF'ти директор/админ гана жана бекитилген документ үчүн гана түзөт.
   - WebSocket'те бөгөттөлгөн колдонуучу жаза албайт. Бөлүнүп келген фреймдер буферленет, кабардын өлчөмүнө чек коюлду.
   - CSV формула инъекциясынан корголду.
   - Фирмалык бланк Volume'да сакталат жана жарактуу PDF экени текшерилет.
   - `documents.js` жана `users.js` ичиндеги бузулган (mojibake) тексттер калыбына келди. Документтерге байланыштуу билдирмелер кыргызчага которулду.
   - Файл жүктөөдө укук multer'ге чейин текшерилет. Каталуу суроонун файлы өчүрүлөт.
   - Документ өчүрүлгөндө бардык файлдары тазаланат. Бекитилген документти автор өчүрө албайт.
   - Журналдагы IP `req.ip` аркылуу алынат.
   - Кирүүдө аккаунттун бар-жогу билинбейт. Логинге rate limit, `helmet` кошулду. Сырсөз кеминде 8 белги.
   - Кабарлар текшерилет. Жеке кабарларды ээлери гана окуйт.
   - Сырсөз алмашканда башка сессиялар жабылат.
   - **PT Sans шрифти кошулду.** Мурун Railway'деги Linux серверде PDF'тер латынча транслитерация менен чыгып жаткан.
   - `test/security.test.js` кошулду, жалпысынан 32 тест өтөт.

## Азыркы абал (2026-10-07)
- `main` = PR #4 (`230c487`).
- `fix-security-review` (коопсуздук оңдоолору + ушул CLAUDE.md) GitHub'га push кылынды, PR ачылып, Merge кылынышы керек: https://github.com/Baiel044/dokument-oborot-trk/pull/new/fix-security-review
- 2026-10-07де GitHub бир саатка жакын бул репого жиберилген бардык push'тарга «Internal Server Error» деп жооп берип турду, андан кийин өзү оңолду. Кайталанса, бир аз күтүп, кайра аракет кылыңыз.
- `docs-claude-md` branch'ы (CLAUDE.md'нин биринчи версиясы) GitHub'да турат, бирок `main`'ге кошула элек. Ушул файл аны толук алмаштырат, андыктан ал PR'ды жаап салса болот.

## Калган иштер
### Шашылыш
- [ ] `fix-security-review` боюнча PR ачуу → Merge.
- [ ] Сайтка `admin` болуп кирип, **Профиль** бөлүмүнөн сырсөздү алмаштыруу.
- [ ] Railway'деги ашыкча `loving-radiance` долбоорун өчүрүү. `humorous-smile` долбооруна **тийбөө**.
- [ ] Railway'дин сыноо мөөнөтү (болжол менен 2026-11-06 чейин) бүткөнгө чейин **Hobby** тарифине өтүү, ансыз сайт токтойт.
- [ ] `iwin.edu.kg` доменин 23.06.2027 чейин cctld.kg'де узартуу.
- [ ] `/data/db/backups` папкасын маал-маалы менен башка жерге көчүрүп туруу.
- [ ] Merge'ден кийин production'до бекитилген документтин расмий PDF'ин ачып, кирилл тамгалары туура чыкканын текшерүү.

### Коопсуздук
- [ ] «Сырсөздү унуттум» азыр админге билдирме гана жөнөтөт. Email аркылуу калыбына келтирүү жок.
- [ ] Жүктөлгөн файлдын түрү браузер берген MIME менен гана текшерилет. Файлдын ичин (magic bytes) текшерүү жок.
- [ ] Токен `localStorage`'да жана WebSocket URL'инде (`?token=`) берилет. Келечекте httpOnly cookie'ге өтүүнү карап көрүү керек.

### Инфраструктура
- [ ] `api.iwin.edu.kg` → Railway Custom Domain (Vercel DNS'ке CNAME жазуусу), андан кийин `VITE_API_URL` жана `CORS_ORIGIN` маанилерин жаңыртуу.
- [ ] Railway Volume'дун өзүнүн backup'тарын күйгүзүү.

### Код сапаты
- [ ] Чоң файлдарды майда бөлүктөргө бөлүү: `DocumentsPage.jsx` (~1350 сап), `RequestsPage.jsx` (~1150), `routes/documents.js` (~1250), `routes/requests.js` (~930).
- [ ] Документ жана арыз workflow'су (статус өтүүлөрү, маршруттоо), номерлөө жана файлга кирүү укугу үчүн дагы тесттер жазуу.
- [ ] `localization.js` жана беттердеги `copyByLanguage` котормолорун бир жерге чогултуу.
- [ ] `RequestsPage.jsx:101` ичинде эски бузулган статустарды таануу үчүн атайын mojibake саптары калтырылган. Эски маалымат тазаланса, аларды алып салса болот.
- [ ] Кабарлар баракчасы эски `/api/messages` суроолорун ар 5 секундда кайталайт (AppShell badges). WebSocket'ке толук өтсө болот.

### Каалоо боюнча
- [ ] Түнкү тема (dark mode), токендер буга даяр.
- [ ] Toast-билдирмелер («Сакталды», «Жөнөтүлдү»).

## Иштөө тартиби
- Өзгөртүүлөр өзүнчө branch'та жасалат → push → GitHub'да PR → колдонуучу Merge басат.
- Commit билдирүүлөрү англисче, conventional стилинде (`feat:`, `fix:`, `docs:`).
- Колдонуучу өзү сурамайынча `main`'ге түз push кылынбайт.
- Интерфейске жаңы текст кошулса, KG жана RU котормолору экөө тең болушу керек.
- Backend'деги жаңы билдирүүлөр жана билдирмелер кыргызча жазылат.
- Ар бир өзгөртүүдөн кийин `npm test` жана `npm run build` иштетилет.
