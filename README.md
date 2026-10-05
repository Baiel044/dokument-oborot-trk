# Система электронного документооборота учебного заведения

Веб-приложение для внутреннего электронного документооборота Таш-Кумырского регионального колледжа. Система объединяет регистрацию сотрудников, ролевой доступ, заявления, документы, внутренние сообщения, уведомления, отчеты, журнал действий и формирование официальных PDF-документов.

## Краткое описание

Проект предназначен для автоматизации внутренних процессов учебного заведения: подачи заявлений, маршрутизации документов, согласования директором, хранения файлов, формирования PDF на фирменном бланке и контроля действий пользователей.

Система состоит из двух частей:

- `backend` - Node.js + Express API;
- `frontend` - React + Vite клиентское приложение.

Данные хранятся в JSON-файле `backend/data/db.json`, загруженные файлы сохраняются в `backend/uploads`.

## Возможности системы

- регистрация и вход по логину/email и паролю;
- JWT-авторизация и защищенные маршруты;
- подтверждение новых аккаунтов администратором или директором;
- разграничение доступа по ролям;
- личный кабинет пользователя;
- загрузка аватара пользователя;
- dashboard со счетчиками и быстрыми переходами;
- внутренние сообщения между пользователями и отделами;
- заявления и обращения преподавателей;
- загрузка документов `PDF`, `Word`, `Excel`;
- автоматическая нумерация документов;
- workflow статусов документов;
- согласование документов директором;
- автоматическая генерация официального PDF после approve;
- защищенное скачивание файлов через API;
- уведомления о важных действиях;
- отчеты и журнал действий;
- интерфейс на русском и кыргызском языках;
- адаптивный frontend-интерфейс.

## Роли пользователей

В системе используются следующие роли:

| Роль | Код | Основные права |
| --- | --- | --- |
| Администратор системы | `ADMIN` | Управление пользователями, ролями, документами, журналом действий |
| Директор | `DIRECTOR` | Согласование документов, подтверждение аккаунтов, просмотр отчетов |
| Преподаватель | `TEACHER` | Создание заявлений и документов, переписка, просмотр своих данных |
| Учебная часть | `ACADEMIC_OFFICE` | Работа с обращениями и документами учебной части |
| Отдел кадров | `HR` | Работа с пользователями и документами отдела кадров |
| Бухгалтерия | `ACCOUNTANT` | Работа с документами и отчетами бухгалтерии |

## Технологический стек

### Frontend

- React 18;
- Vite 5;
- React Router DOM;
- JavaScript;
- CSS.

### Backend

- Node.js `>=20`;
- Express.js;
- JWT (`jsonwebtoken`);
- bcryptjs;
- multer;
- pdf-lib;
- JSON-хранилище.

## Структура проекта

```text
.
|-- backend
|   |-- assets
|   |-- data
|   |   `-- db.json
|   |-- src
|   |   |-- app.js
|   |   |-- server.js
|   |   |-- data
|   |   |-- middleware
|   |   |-- realtime
|   |   |-- routes
|   |   `-- utils
|   |-- uploads
|   `-- package.json
|-- frontend
|   |-- public
|   |-- src
|   |   |-- components
|   |   |-- context
|   |   |-- pages
|   |   |-- router
|   |   |-- services
|   |   |-- utils
|   |   `-- styles.css
|   |-- vite.config.js
|   `-- package.json
|-- package.json
|-- render.yaml
`-- README.md
```

## Установка зависимостей

Из корня проекта:

```bash
npm run install:all
```

Эта команда устанавливает зависимости отдельно для `backend` и `frontend`.

Также можно установить зависимости вручную:

```bash
npm --prefix backend install
npm --prefix frontend install
```

## Быстрый запуск на Windows после скачивания с GitHub

Установите [Node.js LTS](https://nodejs.org/en/download), затем откройте терминал в папке проекта и выполните:

```powershell
npm --prefix backend ci
npm --prefix frontend ci
npm run build
.\start-project.cmd
```

Команда запуска откроет `http://localhost:4000` в браузере. Оставьте терминал открытым; для остановки сервера нажмите `Ctrl+C`. Если сервер уже работает, команда откроет его страницу без повторного запуска.

`start-project.cmd` использует локальный Node.js из `.tools`, если он есть, либо установленный в системе Node.js. Папка `.tools`, зависимости, сборка, журналы, локальная база и загруженные пользовательские файлы не включаются в репозиторий.

## Запуск backend

Из корня проекта:

```bash
npm run dev:backend
```

Или из папки `backend`:

```bash
npm run dev
```

Backend по умолчанию запускается на:

```text
http://localhost:4000
```

Production-команда backend:

```bash
npm run start
```

или из корня:

```bash
npm run start
```

## Запуск frontend

Из корня проекта:

```bash
npm run dev:frontend
```

Или из папки `frontend`:

```bash
npm run dev
```

Frontend по умолчанию запускается на:

```text
http://localhost:5173
```

Сборка frontend:

```bash
npm run build
```

Preview сборки из папки `frontend`:

```bash
npm run preview
```

## Переменные окружения

### Backend

Файл-пример: `backend/.env.example`

```env
PORT=4000
JWT_SECRET=change-this-secret
CORS_ORIGIN=http://localhost:5173
```

Backend читает значения из `process.env`. При локальном запуске через PowerShell переменные можно задать перед стартом:

```powershell
$env:PORT="4000"
$env:JWT_SECRET="change-this-secret"
$env:CORS_ORIGIN="http://localhost:5173"
npm run dev:backend
```

### Frontend

Файл: `frontend/.env`

```env
VITE_API_URL=
```

Если `VITE_API_URL` пустой, frontend использует текущий origin и Vite proxy. Для отдельного backend можно указать:

```env
VITE_API_URL=http://localhost:4000
```

## Тестовые пользователи

Seed-пользователи находятся в `backend/src/data/store.js` и создаются при первичной инициализации `backend/data/db.json`.

| Роль | Логин | Пароль |
| --- | --- | --- |
| Администратор | `admin` | `admin123` |
| Директор | `director` | `director123` |
| Преподаватель | `teacher` | `teacher123` |
| Учебная часть | `academic` | `academic123` |
| Отдел кадров | `hr` | `hr123456` |
| Бухгалтерия | `accountant` | `account123` |

## Основные API endpoints

### Авторизация

- `POST /api/auth/register` - регистрация пользователя;
- `POST /api/auth/login` - вход в систему;
- `GET /api/auth/me` - текущий пользователь;
- `POST /api/auth/forgot-password` - запрос восстановления пароля.

### Пользователи

- `GET /api/users` - список пользователей;
- `GET /api/users/me` - профиль текущего пользователя;
- `GET /api/users/directory` - справочник активных пользователей;
- `POST /api/users/avatar` - загрузка аватара текущего пользователя;
- `POST /api/users/me/avatar` - альтернативный endpoint загрузки аватара;
- `PATCH /api/users/:id/approve` - подтверждение пользователя;
- `PATCH /api/users/:id/role` - изменение роли пользователя;
- `PUT /api/users/:id` - обновление пользователя;
- `DELETE /api/users/:id` - удаление пользователя.

### Документы

- `GET /api/documents` - список документов;
- `GET /api/documents/:id` - просмотр документа;
- `POST /api/documents` - загрузка документа;
- `POST /api/documents/letterhead` - создание документа на фирменном бланке;
- `PATCH /api/documents/:id/status` - смена статуса документа;
- `POST /api/documents/:id/approve` - одобрение директором;
- `POST /api/documents/:id/return` - возврат документа;
- `POST /api/documents/:id/generate-pdf` - генерация официального PDF;
- `POST /api/documents/:id/files` - добавление файла к документу;
- `POST /api/documents/:id/assign` - направление документа сотруднику;
- `PUT /api/documents/:id/assignments/:assignmentId/status` - обновление статуса задания.

### Заявления

- `GET /api/applications` - список заявлений;
- `POST /api/applications` - создание заявления;
- `GET /api/applications/:id` - просмотр заявления;
- `PATCH /api/applications/:id/status` - смена статуса заявления.

`/api/applications` использует тот же backend route, что и `/api/requests`, для совместимости с техническим заданием.

### Сообщения

- `GET /api/messages` - список сообщений;
- `POST /api/messages` - отправка сообщения;
- `GET /api/messages/:id` - просмотр сообщения;
- `PATCH /api/messages/:id/read` - отметить сообщение прочитанным;
- `PUT /api/messages/read-all/inbox` - отметить входящие прочитанными;
- `WS /api/messages/ws?token=<JWT>` - WebSocket для сообщений.

### Уведомления

- `GET /api/notifications` - список уведомлений;
- `PATCH /api/notifications/:id/read` - отметить уведомление прочитанным;
- `PUT /api/notifications/read-all` - отметить все уведомления прочитанными.

### Отчеты и журнал

- `GET /api/reports/summary` - сводка отчетов;
- `GET /api/reports/summary.csv` - экспорт CSV;
- `GET /api/reports/summary.pdf` - экспорт PDF;
- `GET /api/activity-log` - журнал действий;
- `GET /api/audit-logs` - alias журнала действий;
- `GET /api/audit-logs/export.csv` - экспорт журнала.

### Файлы

- `GET /api/files/:fileName` - защищенное скачивание файла;
- `GET /api/users/avatars/:fileName` - получение аватара пользователя.

## Работа с документами

Документы создаются и хранятся в JSON-хранилище. Для документа сохраняются:

- `id`;
- `title`;
- `description`;
- `documentType`;
- `documentTypeCode`;
- `sequenceNumber`;
- `documentNumber`;
- `status`;
- `uploadedBy`;
- `category`;
- `files`;
- `officialPdf`;
- `isOfficial`;
- `routeHistory`;
- `assignments`;
- `createdAt`;
- `updatedAt`;
- `approvedAt`;
- `approvedBy`.

Поддерживаются документы типов:

- `application` - заявление;
- `order` - приказ;
- `certificate` - справка;
- `incoming` - входящий документ;
- `outgoing` - исходящий документ;
- `report` - отчет.

## Workflow статусов документов

Используется единый workflow:

```text
draft -> submitted
submitted -> pending
pending -> approved
pending -> returned
pending -> rejected
returned -> submitted
approved -> completed
```

Статусы:

| Статус | Значение |
| --- | --- |
| `draft` | Черновик |
| `submitted` | Отправлено |
| `pending` | На рассмотрении |
| `approved` | Одобрено |
| `returned` | Возвращено |
| `rejected` | Отклонено |
| `completed` | Завершено |

При каждом изменении статуса:

- проверяется разрешенный переход;
- проверяются права пользователя;
- обновляется `routeHistory`;
- создается уведомление;
- создается запись в `activity log`.

## Автоматическая нумерация документов

При создании документа система автоматически присваивает номер в формате:

```text
№1/1
№1/2
№2/1
№3/1
```

Первая цифра - код типа документа, вторая цифра - порядковый номер внутри типа.

Коды типов:

| Тип | Код |
| --- | --- |
| `application` | `1` |
| `order` | `2` |
| `certificate` | `3` |
| `incoming` | `4` |
| `outgoing` | `5` |
| `report` | `6` |

Пользователь не вводит номер вручную. Номер сохраняется в полях:

- `documentTypeCode`;
- `sequenceNumber`;
- `documentNumber`.

## Автоматическая генерация PDF

Официальный PDF формируется через `pdf-lib`.

PDF создается:

- вручную через `POST /api/documents/:id/generate-pdf`;
- автоматически после успешного approve директором через `POST /api/documents/:id/approve`.

После генерации:

- PDF сохраняется в `backend/uploads`;
- путь записывается в `document.officialPdf`;
- `document.isOfficial` становится `true`;
- заполняется `officialPdfGeneratedAt`;
- создается уведомление;
- создается запись в журнале действий.

Если в проекте есть фирменный PDF-шаблон колледжа, он используется при генерации. Если шаблон отсутствует, система формирует безопасный fallback PDF.

## Protected download файлов

Файлы документов и официальные PDF скачиваются только через защищенный endpoint:

```text
GET /api/files/:fileName
```

Запрос должен содержать JWT:

```http
Authorization: Bearer <TOKEN>
```

Прямой доступ к `/uploads` заблокирован. Backend возвращает `404` и сообщает, что файлы доступны только через защищенные API routes.

Frontend не должен использовать прямые ссылки `/uploads/...` для документов. Для PDF и документов используется `/api/files/:fileName`.

## Работа с уведомлениями

Уведомления создаются при важных действиях:

- регистрация нового пользователя;
- подтверждение аккаунта;
- отправка документа на рассмотрение;
- approve/return/reject/completed документа;
- генерация официального PDF;
- отправка сообщения;
- назначение документа сотруднику.

Пользователь может:

- просматривать свои уведомления;
- фильтровать непрочитанные;
- отмечать одно уведомление прочитанным;
- отмечать все уведомления прочитанными.

## Работа с activity log

Журнал действий фиксирует ключевые события:

- вход в систему;
- неудачная попытка входа;
- регистрация пользователя;
- подтверждение пользователя;
- изменение роли;
- создание документа;
- изменение статуса документа;
- генерация PDF;
- отправка сообщения;
- прочтение сообщения;
- прочтение уведомления;
- действия администратора.

Журнал доступен через:

```text
GET /api/activity-log
GET /api/audit-logs
```

Для экспорта используется:

```text
GET /api/audit-logs/export.csv
```

## Проверка проекта перед демонстрацией

Рекомендуемый порядок проверки:

1. Установить зависимости:

```bash
npm run install:all
```

2. Запустить backend:

```bash
npm run dev:backend
```

3. Запустить frontend:

```bash
npm run dev:frontend
```

4. Проверить вход под ролями:

- `admin / admin123`;
- `director / director123`;
- `teacher / teacher123`.

5. Проверить основные разделы:

- главная панель;
- заявления;
- документы;
- сообщения;
- уведомления;
- пользователи;
- отчеты;
- админ-панель.

6. Проверить workflow документа:

- создание документа преподавателем;
- отправка на рассмотрение;
- approve директором;
- появление метки `PDF готов`;
- открытие и скачивание PDF.

7. Выполнить сборку frontend:

```bash
npm run build
```

8. Проверить backend-файлы через Node:

```bash
node --check backend/src/server.js
node --check backend/src/app.js
node --check backend/src/routes/documents.js
```

## Возможные проблемы и решения

### Frontend не может подключиться к backend

Проверьте, что backend запущен на `http://localhost:4000`.

Если frontend запущен отдельно, проверьте `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000
```

После изменения `.env` перезапустите Vite.

### Ошибка 401 Unauthorized

Пользователь не авторизован или JWT истек. Нужно выйти из системы и войти повторно.

### Новый пользователь не может войти

После регистрации аккаунт имеет статус `pending`. Его должен подтвердить администратор или директор.

### PDF не открывается

Проверьте:

- документ имеет `officialPdf`;
- используется `/api/files/:fileName`;
- запрос содержит `Authorization: Bearer <TOKEN>`;
- файл физически существует в `backend/uploads`.

### Прямой путь `/uploads/...` возвращает 404

Это ожидаемое поведение. Документы не отдаются публично. Используйте protected download через `/api/files/:fileName`.

### Данные исчезли после деплоя

Проект использует JSON-хранилище и локальную папку `uploads`. На некоторых хостингах локальный диск может быть временным. Для production рекомендуется подключить постоянное хранилище данных и файлов.

### Порт занят

Измените порт backend через переменную окружения:

```powershell
$env:PORT="4010"
npm run dev:backend
```

## Статус готовности проекта

Проект готов к демонстрации основной функциональности:

- API compatibility проверена;
- workflow статусов документов работает;
- автоматическая нумерация документов работает;
- PDF-генерация работает;
- PDF создается автоматически после approve директором;
- protected download работает;
- frontend показывает PDF-кнопки;
- старые документы без PDF не ломают интерфейс;
- сборка frontend проходит.

Перед финальной сдачей рекомендуется выполнить ручной UI-checklist в браузере: проверить вход под разными ролями, dashboard-карточки, документы, PDF, заявления, сообщения, уведомления, пользователей, отчеты и адаптивность на мобильных размерах.
