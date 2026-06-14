# AFVS Backend — NestJS

Backend untuk Airport Flight Validation System. Tujuannya menerima outbox dari kiosk Next.js: flights master data, scan events (idempotent by `eventId`), foto wajah, hasil verifikasi KTP.

## Stack

- **NestJS 10** + TypeScript
- **Prisma** ORM (Postgres production / SQLite dev)
- **Passport JWT** auth (`/api/auth/login`, role: operator/supervisor/admin)
- **Multer** file upload (foto wajah → disk lokal)
- **Swagger** API docs di `/docs`
- **Helmet + Throttler** untuk hardening dasar

## Struktur

```
backend/
├── prisma/
│   ├── schema.prisma     # data model
│   └── seed.ts           # bootstrap admin
├── src/
│   ├── main.ts           # bootstrap + Swagger + CORS
│   ├── app.module.ts
│   ├── auth/             # login, JWT strategy, roles guard
│   ├── flights/          # CRUD master data flights
│   ├── scan-events/      # idempotent push + list (multipart upload)
│   ├── face-photos/      # serve foto wajah ke admin
│   ├── prisma/           # PrismaService global
│   └── common/           # decorators (Roles)
└── uploads/              # foto disimpan per tanggal
```

## Quick start (development)

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, SEED_ADMIN_*

# Install deps (Node 20 LTS + pnpm/npm)
npm install

# Spin up Postgres lokal (atau pakai SQLite — ganti provider di schema.prisma)
docker run -d --name afvs-db -e POSTGRES_USER=afvs -e POSTGRES_PASSWORD=afvs_password \
  -e POSTGRES_DB=afvs -p 5432:5432 postgres:16-alpine

# Generate Prisma client + migrate
npx prisma generate
npx prisma migrate dev --name init

# Seed admin user
npx ts-node prisma/seed.ts

# Run dev
npm run start:dev
```

Buka:
- API → `http://localhost:3001/api`
- Swagger → `http://localhost:3001/docs`

## API endpoints inti

| Method | Path                          | Auth   | Keterangan                                      |
|--------|-------------------------------|--------|-------------------------------------------------|
| POST   | `/api/auth/login`             | -      | Login operator, return JWT                      |
| GET    | `/api/auth/me`                | JWT    | Profile current user                            |
| GET    | `/api/flights`                | JWT    | List flights (filter station/date/status)       |
| POST   | `/api/flights`                | sup/ad | Create flight                                   |
| PATCH  | `/api/flights/:id`            | sup/ad | Update status/STD                               |
| DELETE | `/api/flights/:id`            | admin  | Hapus flight                                    |
| POST   | `/api/scan-events`            | JWT    | Push scan (multipart, idempotent by `eventId`)  |
| GET    | `/api/scan-events`            | JWT    | List scans (filter station/date/flight/status)  |
| GET    | `/api/scan-events/:eventId`   | JWT    | Detail satu scan                                |
| GET    | `/api/face-photos/:eventId`   | JWT    | Stream JPEG foto wajah                          |

## Kontrak idempotency

Client kiosk meng-generate `eventId` (= `ScanEvent.id` lokal, mis. `cuid`/`uuid`). Backend:
- Kalau `eventId` sudah ada → return existing record (200), tidak duplikat
- Field `flightId` di-resolve otomatis dari `flightNumber + station + tanggal scannedAt`

Cocok untuk outbox client yang retry sampai sukses.

## Deploy ke Proxmox VM Ubuntu

Lihat [docs/nestjs-deploy.md](../docs/nestjs-deploy.md).

## Migration ke Postgres production

Default schema sudah Postgres. Untuk produksi:
1. Provision Postgres di VM (atau container terpisah)
2. Set `DATABASE_URL` di `.env`
3. `npx prisma migrate deploy` (apply pending migrations)
4. `npx ts-node prisma/seed.ts` sekali untuk admin
5. Jalankan `npm run build && npm run start:prod`

## Tidak include (next steps)

Sengaja dibiarkan minimal supaya bisa diintegrasi bertahap:
- Refresh token / session revocation (sekarang JWT akses langsung 12h)
- Audit log table
- Soft-delete / retention foto otomatis (cron)
- Realtime websocket untuk dashboard live
- Tests (e2e + unit)
- Rate-limit per-IP yang lebih granular
