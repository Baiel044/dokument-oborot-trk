# Tash-Kumyr Regional College Document Workflow

Web application for internal document workflow in an educational institution.
The system supports role-based access, internal messaging, requests to the director,
document uploads, notifications, reports, bilingual interface (`RU/KG`) and official
PDF generation on the college letterhead.

## Repository Description

This repository contains the full source code of the project:

- `frontend` - React + Vite client application
- `backend` - Node.js + Express API
- `лого` - исходные графические материалы
- `ТЗ` - текст технического задания
- `фирменный лист` - исходники фирменного бланка

## Implemented Features

- registration and login with role-based access
- approval of new accounts by administrator or director
- dashboard for each role
- internal messaging between employees
- unread counters for messages and notifications
- teacher requests to the director
- director approval with digital signature metadata
- automatic generation of official PDF documents
- routing of approved documents to HR, accounting or back to teacher
- upload of `PDF`, `Word`, `Excel`
- document generation on the official letterhead
- reports, audit log and admin panel
- interface language switcher: Russian / Kyrgyz

## Tech Stack

- `frontend`: React, Vite, React Router
- `backend`: Node.js, Express
- `auth`: JWT
- `file upload`: multer
- `PDF generation`: pdf-lib
- `storage`: JSON file storage for MVP

## Project Structure

```text
.
├── backend
│   ├── assets
│   ├── src
│   └── package.json
├── frontend
│   ├── public
│   ├── src
│   └── package.json
├── лого
├── ТЗ
├── фирменный лист
├── render.yaml
└── package.json
```

## Local Run

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Start backend

```bash
npm run dev:backend
```

Backend will be available at `http://localhost:4000`.

### 3. Start frontend

```bash
npm run dev:frontend
```

Frontend will be available at `http://localhost:5173`.

## Environment Variables

### Backend

File: `backend/.env.example`

```env
PORT=4000
JWT_SECRET=change-this-secret
CORS_ORIGIN=http://localhost:5173
```

### Frontend

File: `frontend/.env.example`

```env
VITE_API_URL=http://localhost:4000
```

For single-service deploy, `VITE_API_URL` can be omitted because frontend requests
will go to the same origin.

## Test Accounts

- `admin / admin123`
- `director / director123`
- `teacher / teacher123`
- `academic / academic123`
- `hr / hr123456`
- `accountant / account123`

## Build

```bash
npm run build
```

This command builds the frontend into `frontend/dist`.

## Production Start

```bash
npm run start
```

In production mode the backend can serve the built frontend from `frontend/dist`.

## Deploy Preparation

The repository is prepared for deployment with:

- root `package.json` with common scripts
- `render.yaml` for Render-style deployment
- backend support for serving the built frontend
- configurable `CORS_ORIGIN`
- `.env.example` files for frontend and backend

### Recommended Deploy Flow

1. Create environment variables:
   - `JWT_SECRET`
   - `CORS_ORIGIN` if frontend is deployed separately
2. Run build command:

```bash
npm run render-build
```

3. Start application:

```bash
npm run start
```

## Important Notes

- Current storage is file-based MVP storage in `backend/data/db.json`.
- Uploaded files are stored in `backend/uploads`.
- On many cloud platforms local disk is ephemeral.
- For real production use, move data to `PostgreSQL` or `MySQL` and files to persistent storage.
- If you deploy on Render/Railway/Fly without persistent volume, data and uploads may reset after redeploy.

## Repository Link

- GitHub: `https://github.com/Baiel044/dokument-oborot-trk`
