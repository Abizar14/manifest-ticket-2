# Panduan Setup Setelah Clone — SIPANDAI (AFVS)

Langkah menyiapkan project di laptop baru setelah `git clone`. Ada **2 mode**:

- **Mode A — Frontend saja (offline).** Paling cepat, cukup untuk demo scan & jadwal. Data disimpan di browser (localStorage/IndexedDB). **Tidak butuh database.**
- **Mode B — Full (Frontend + Backend + MySQL).** Untuk fitur admin/petugas, sinkron scan ke database, upload foto petugas, dll.

> **Penting:** file `.env` **tidak ikut ter-clone** (di-ignore git). Jadi di laptop baru **wajib dibuat ulang** — isinya ada di bawah.

---

## 0. Prasyarat (semua mode)

| Tool | Versi | Catatan |
|---|---|---|
| Node.js | **≥ 18.17** | cek: `node -v` |
| npm | bawaan Node | atau pnpm/yarn |
| Git | apa saja | |
| MySQL | 8.x | **hanya untuk Mode B** (paling gampang pakai **Laragon**) |

---

## Mode A — Frontend saja (tercepat) ⚡

```bash
# 1. masuk folder hasil clone
cd manifest-ticket-2

# 2. install dependency (termasuk framer-motion utk splash screen)
npm install

# 3. buat file .env.local (lihat isi di bawah)

# 4a. jalankan untuk DEVELOPMENT
npm run dev          # buka http://localhost:3000

# 4b. atau jalankan untuk DEMO (lebih ngebut, tanpa lag compile)
npm run build
npm run start        # buka http://localhost:3000
```

**Isi `.env.local`** (root project) — salin dari `.env.local.example`:
```env
NEXT_PUBLIC_AFVS_API_BASE=http://localhost:3001/api
NEXT_PUBLIC_SENTRY_DSN=
```
> Tanpa backend, baris API base boleh dibiarkan — app otomatis fallback ke localStorage.

**Akun demo (offline):**
| Peran | Login |
|---|---|
| Petugas/Security | PIN `1234`, `2345`, atau `3456` |
| Admin | `admin@airport.test` / `password` |
| Supervisor | `supervisor@airport.test` / `password` |

> ⚠️ Fitur kamera (scan barcode, foto wajah, OCR KTP) hanya jalan di **`localhost`** atau **HTTPS**. Aman kalau buka langsung dari laptop ini.

---

## Mode B — Full dengan Backend + MySQL 🗄️

### B1. Siapkan database MySQL
Pakai **Laragon** (start MySQL), lalu buat database kosong bernama `afvs`:
```sql
CREATE DATABASE afvs;
```
> Default kredensial Laragon: user `root`, password kosong **atau** `12345`. Sesuaikan di `DATABASE_URL` (langkah B2).

### B2. Setup backend
```bash
cd manifest-ticket-2/backend

# install dependency backend
npm install

# buat file .env (lihat isi di bawah)

# generate Prisma client
npx prisma generate

# buat tabel di DB (pakai migration yang sudah ada)
npx prisma migrate deploy
#   alternatif kalau migrate bermasalah:  npx prisma db push

# isi data awal (admin + operator demo)
npx ts-node prisma/seed.ts

# jalankan backend (watch mode)
npm run start:dev      # listening di http://localhost:3001  (docs: /docs)
```

**Isi `backend/.env`** — salin dari `backend/.env.example`, lalu **ganti baris DATABASE_URL jadi MySQL**:
```env
# Database — sesuaikan user:password dengan MySQL/Laragon kamu
DATABASE_URL="mysql://root:12345@127.0.0.1:3306/afvs"

# JWT (min 32 char). Untuk dev boleh string panjang acak apa saja.
JWT_SECRET="dev-secret-please-change-in-prod-aaaaaaaaaaaaaaaaaa"
JWT_EXPIRES_IN="12h"
PIN_LOOKUP_SECRET="dev-pin-lookup-secret-please-change-bbbbbbbbbbbbbbbb"

PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"

UPLOAD_DIR="./uploads"
UPLOAD_MAX_SIZE=1048576

# Admin awal (dibuat oleh seed)
SEED_ADMIN_EMAIL="admin@afvs.local"
SEED_ADMIN_PASSWORD="ChangeMe!2026"
SEED_ADMIN_NAME="Admin"
```
> ⚠️ `.env.example` defaultnya menulis SQLite (`file:./dev.db`). **Abaikan** — schema Prisma project ini memakai **MySQL**, jadi pakai `DATABASE_URL` MySQL seperti di atas.

### B3. Setup frontend (terhubung ke backend)
Sama seperti Mode A, pastikan `.env.local` mengarah ke backend:
```env
NEXT_PUBLIC_AFVS_API_BASE=http://localhost:3001/api
```
Lalu `npm install` + `npm run dev` (atau `build` + `start`).

**Akun backend:** `admin@afvs.local` / `ChangeMe!2026`

---

## Urutan menjalankan (Mode B)
1. **Start MySQL** (Laragon).
2. **Backend:** `cd backend && npm run start:dev` → port **3001**.
3. **Frontend:** `npm run dev` (atau `build`+`start`) → port **3000**.

---

## Seeder / Data Awal

Project ini punya **3 macam seeder** yang berbeda. Pilih sesuai kebutuhan.

### 1. Seeder Backend (MySQL) — akun admin & petugas
Mengisi tabel `Operator` dengan admin + petugas demo. **Wajib** untuk Mode B agar bisa login backend. Aman dijalankan berulang (idempotent — yang sudah ada dilewati).

```bash
cd backend
npx ts-node prisma/seed.ts
```

Akun yang dibuat:
| Email | Login | Role / Station |
|---|---|---|
| `admin@afvs.local` | `ChangeMe!2026` | admin |
| `operator@afvs.local` | `operator123` | operator / CGK-T3 |
| `avsec1@afvs.local` (Andi) | PIN `1234` | SCP2 |
| `avsec2@afvs.local` (Budi) | PIN `2345` | SCP2 |
| `avsec3@afvs.local` (Citra) | PIN `3456` | SCP2 |
| `avsec4@afvs.local` (Dewi) | PIN `4567` | BLUESKY |
| `avsec5@afvs.local` (Eko) | PIN `5678` | BLUESKY |

> ⚠️ Saat `NODE_ENV=production`, seeder demo **otomatis dilewati** (proteksi F-04). Untuk memaksa: `SEED_ALLOW_DEMO=true npx ts-node prisma/seed.ts`.
>
> Menambah/ubah data: edit array di `backend/prisma/seed.ts`, lalu jalankan ulang.

### 2. Seeder Frontend (localStorage) — flight & user demo
**Otomatis** jalan via `ensureSeed()` saat app pertama dibuka — **tidak perlu perintah**. Mengisi 5 user + 6 flight (tanggal otomatis "hari ini").

Reset / isi ulang:
- Lewat UI: **Settings → reset data**, atau
- DevTools → Application → Local Storage → hapus key `afvs.*` → refresh (seed ditulis ulang).

Menambah/ubah data: edit `src/lib/mockData.ts` (`buildSeedFlights()` / `DUMMY_USERS`), lalu reset.

### 3. Seeder Boarding Pass — barcode untuk demo scan
Buka halaman **`/seeders/boarding-pass`** di app. Generate ±10 boarding pass per flight (lengkap QR/barcode) dari jadwal yang ada, untuk dicoba scan di kiosk. Cukup buka halamannya — tanpa CLI.

---

## Verifikasi cepat
```bash
# backend hidup?
curl http://localhost:3001/api/auth/login   # balas 4xx (artinya server jalan)

# frontend hidup?
# buka http://localhost:3000 di browser
```
- Cek isi database: `cd backend && npx prisma studio`.

---

## Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| `Port 3000/3001 in use` | Ada server lama jalan. Matikan prosesnya atau jalankan di port lain. |
| Kamera tidak muncul saat scan | Buka via `localhost` atau HTTPS (`npm run dev:https`). HP via IP LAN (http) **tidak** bisa kamera. |
| `/jadwal` lama / kosong | Bergantung server FIDS bandara eksternal (bisa lambat/mati). Bukan error setup. |
| Backend gagal start: `JWT_SECRET` | `JWT_SECRET` & `PIN_LOOKUP_SECRET` wajib ≥32 char. |
| Prisma: `Can't reach database` | MySQL belum nyala / `DATABASE_URL` salah user-password-port. |
| `ts-node not found` saat seed | Jalankan dari folder `backend` (ts-node ada di devDependencies-nya). |
| Habis ubah kode tapi mode `start` tak berubah | Mode production tidak auto-reload — `npm run build` lagi lalu `npm run start`. |

---

## Catatan untuk demo
- Pakai **`npm run build` + `npm run start`** (bukan `dev`) saat demo → navigasi antar-menu instan.
- Kalau hanya butuh alur scan & dashboard, **Mode A sudah cukup** — tidak perlu repot MySQL.
