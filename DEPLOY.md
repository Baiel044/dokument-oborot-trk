# Интернетке чыгаруу: Railway (backend) + Vercel (frontend)

```text
Колдонуучу ──► Vercel (React сайт) ──► Railway (Express API + SQLite + файлдар)
                                         └── Volume /data: база, жүктөлгөн файлдар, backup
```

- **Railway**: backend, база жана файлдар туруктуу дискте (Volume) сакталат, WebSocket иштейт.
- **Vercel**: frontend (React) гана жайгашат.

Тартип маанилүү: адегенде Railway, анткени Vercel'ге backend'дин дареги керек.

---

## 1. Railway: backend

### 1.1. Долбоор түзүү
1. https://railway.com сайтына GitHub аккаунту менен кириңиз.
2. **New Project → Deploy from GitHub repo**, анан `Baiel044/dokument-oborot-trk` репосун тандаңыз.
   Репо тизмеде жок болсо, **Configure GitHub App** аркылуу Railway'ге ушул репого кирүү уруксатын бериңиз.
3. Railway репонун түпкү папкасындагы `railway.json` файлын өзү окуйт: backend'ди гана курат жана `node backend/src/server.js` буйругу менен иштетет. Root Directory'ни өзгөртпөңүз.

> Биринчи deploy ката менен бүтөт. Бул күтүлгөн нерсе, анткени өзгөрмөлөр (Variables) али коюла элек. 1.2 жана 1.3-кадамдардан кийин оңолот.

### 1.2. Volume (туруктуу диск) кошуу
1. Долбоордогу сервисти ачып, **Settings → Volumes → Add Volume** басыңыз.
2. Mount path: `/data`
3. Бул болбосо, ар бир deploy'до база жана файлдар өчөт.

### 1.3. Өзгөрмөлөр (Variables)
Сервистин **Variables** бөлүмүнө төмөнкүлөрдү кошуңуз:

| Аты | Мааниси | Түшүндүрмө |
|---|---|---|
| `NODE_ENV` | `production` | |
| `JWT_SECRET` | 64 белгиден турган кокус сап | Төмөндөгү буйрук менен түзүңүз |
| `ADMIN_USERNAME` | `admin` | Биринчи администратордун логини |
| `ADMIN_EMAIL` | `admin@...` | |
| `ADMIN_PASSWORD` | кеминде 10 белги, татаал | Биринчи киргенден кийин профилден алмаштырыңыз |
| `DATA_DIR` | `/data/db` | База жана backup |
| `UPLOAD_DIR` | `/data/uploads` | Жүктөлгөн файлдар |
| `CORS_ORIGIN` | азырынча `*` | 2-бөлүмдөн кийин Vercel'дин дарегине алмаштырасыз |

`JWT_SECRET` түзүү (компьютериңизде):
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`PORT` коюунун кереги жок, аны Railway өзү берет.

### 1.4. Дарек алуу жана текшерүү
1. **Settings → Networking → Generate Domain** басыңыз. Мисалы, `eduflow-api-production.up.railway.app` деген дарек чыгат.
2. Браузерде `https://<railway-дарек>/api/health` ачыңыз. `{"status":"ok"}` чыкса, backend иштеп жатат.
3. **Deploy Logs** ичинде төмөнкү саптар болушу керек:
   - `Server started on http://0.0.0.0:...`
   - `[backup] eduflow-....sqlite created`

---

## 2. Vercel: frontend

1. https://vercel.com сайтына GitHub аккаунту менен кириңиз.
2. **Add New → Project**, анан `dokument-oborot-trk` репосун тандап, **Import** басыңыз.
3. Жөндөөлөр:
   - **Root Directory**: `frontend` (сөзсүз ушуну тандаңыз)
   - Framework: Vite (`frontend/vercel.json` файлынан өзү аныкталат)
4. **Environment Variables**:
   - `VITE_API_URL` = `https://<railway-дарек>` (аягына `/` коюлбайт)
5. **Deploy** басыңыз. Даяр болгондо `https://<долбоор>.vercel.app` деген дарек чыгат.

> `VITE_API_URL` build учурунда кодго кошулат. Аны өзгөртсөңүз, Vercel'де **Redeploy** басуу керек.

---

## 3. CORS: Railway'ге Vercel дарегин айтуу

Railway → Variables бөлүмүндө:

```
CORS_ORIGIN=https://<долбоор>.vercel.app
```

Vercel'дин preview даректерине да уруксат берүү үчүн:

```
CORS_ORIGIN=https://<долбоор>.vercel.app,https://<долбоор>-*.vercel.app
```

Өзгөрмөнү сактаганда Railway өзү кайра deploy кылат.

---

## 4. Акыркы текшерүү
1. `https://<долбоор>.vercel.app` ачып, `ADMIN_USERNAME` / `ADMIN_PASSWORD` менен кириңиз.
2. **Профиль** бөлүмүнөн сырсөздү алмаштырыңыз.
3. Документ жүктөп, PDF ачып, кабар жөнөтүп көрүңүз. Жогорку оң бурчтагы «Онлайн» белгиси WebSocket иштеп жатканын билдирет.
4. Railway'де **Redeploy** басып, андан кийин маалымат жана файлдар ордунда калганын текшериңиз.

---

## 5. Өз домениңизди туташтыруу (каалоо боюнча)
- Frontend: Vercel → Project → **Settings → Domains**, мисалы `edo.trk.kg`.
- Backend: Railway → **Settings → Networking → Custom Domain**, мисалы `api.edo.trk.kg`.
- Андан кийин Vercel'деги `VITE_API_URL` жана Railway'деги `CORS_ORIGIN` маанилерин жаңы даректерге алмаштырып, Vercel'де Redeploy басыңыз.

---

## 6. Учурдагы маалыматты Railway'ге көчүрүү (керек болсо)
Бош база менен баштасаңыз, бул кадам керек эмес.

Компьютердеги маалыматты көчүрүү үчүн:
1. Компьютерде серверди бир жолу жаңы версия менен иштетиңиз, ошондо `db.json` SQLite'ка көчүрүлөт. Андан кийин серверди токтотуңуз.
2. `backend/data/eduflow.sqlite` файлын жана `backend/uploads` папкасын Railway Volume'га жүктөңүз:
   ```powershell
   npm i -g @railway/cli
   railway login
   railway link
   railway ssh
   ```
   SSH'тан кийин `/data/db` жана `/data/uploads` папкаларына файлдарды көчүрүңүз.
3. Railway'де сервисти кайра иштетиңиз.

> Компьютердеги базада тесттик колдонуучулар бар (`admin123` ж.б.). Көчүргөндөн кийин алардын сырсөздөрүн сөзсүз алмаштырыңыз же колдонуучуларды өчүрүңүз.

---

## Backup
- Сервер ар 24 саатта `/data/db/backups` папкасына базанын көчүрмөсүн түзөт, акыркы 14 көчүрмө сакталат.
- Volume бузулса, backup'тар да жоголот. Ошондуктан айына бир-эки жолу `railway ssh` аркылуу акыркы backup'ты компьютериңизге көчүрүп туруңуз.
- Railway'де Volume'дун өзүнүн backup'ын да күйгүзүп койсо болот: **Volume → Backups**.

## Баасы (болжол менен)
- Vercel Hobby: бекер.
- Railway: айына болжол менен $5 (Hobby план), кичине колледж үчүн жетиштүү.

## Көп кездешкен каталар

| Белги | Себеби жана чечими |
|---|---|
| Railway logs: `JWT_SECRET must be set...` | `JWT_SECRET` коюлган эмес же 32 белгиден кыска |
| Railway logs: `ADMIN_PASSWORD ... is required` | База бош, ал эми `ADMIN_PASSWORD` коюлган эмес |
| Сайтта «Сервер жеткиликсиз» | `VITE_API_URL` туура эмес же жок. Аны оңдоп, Vercel'де Redeploy басыңыз |
| Браузер консолунда CORS катасы | `CORS_ORIGIN` ичинде Vercel'дин так дареги жок (аягында `/` болбошу керек) |
| Deploy'дон кийин маалымат жоголду | Volume `/data` кошулган эмес же `DATA_DIR`/`UPLOAD_DIR` `/data/...` папкасын көрсөтпөйт |
| `database ... is already used by another running server` | Мурунку экземпляр али өчө элек. Бир аз күтүңүз, Railway өзү кайра аракет кылат |
