# Deploy Guide (Frontend + Backend Terpisah)

## 1) Deploy Backend (Express)

Project backend ada di file `server.ts`.

### Opsi cepat: Render / Railway / Fly.io

- Build command: `npm install`
- Start command: `npm run server`

Set environment variables di backend:

- `GEMINI_API_KEY=...`
- `ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app`
- `PORT` (opsional, biasanya diisi otomatis oleh platform)

Kalau frontend domain lebih dari satu, isi `ALLOWED_ORIGINS` dengan koma:

`ALLOWED_ORIGINS=https://app-a.vercel.app,https://app-b.vercel.app`

### Verifikasi backend

Pastikan endpoint ini bisa diakses:

- `GET https://your-backend-domain.com/api/health`

Harus return JSON:

`{"status":"ok"}`

## 2) Deploy Frontend (Vercel)

Set environment variable di project frontend:

- `VITE_API_BASE_URL=https://your-backend-domain.com`

Lalu redeploy frontend.

## 3) Checklist kalau upload CSV masih gagal

- Backend URL benar dan live (`/api/health` sukses)
- `VITE_API_BASE_URL` sudah terisi di frontend
- `ALLOWED_ORIGINS` berisi domain frontend yang benar
- `GEMINI_API_KEY` valid di backend
