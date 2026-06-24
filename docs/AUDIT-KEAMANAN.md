# Audit Keamanan & Kelayakan Deploy — AFVS

**Aplikasi:** Airport Flight Validation System (AFVS / "si-pandai")
**Tanggal audit:** 23 Juni 2026
**Auditor:** Tinjauan kode otomatis (Claude)
**Konteks:** Aplikasi akan dipakai di lingkungan bandara untuk validasi boarding pass + verifikasi wajah/KTP penumpang.

---

## 1. Ringkasan Eksekutif

### Verdict: 🔴 **BELUM LAYAK DEPLOY ke produksi (bandara)**

Aplikasi sudah matang secara fungsional (validasi barcode IATA BCBP, OCR KTP, capture wajah, mode kiosk, sinkronisasi offline/outbox, manajemen petugas). **Namun terdapat sejumlah celah keamanan tingkat KRITIS yang harus ditutup sebelum dipakai menangani data penumpang riil**, terutama karena sistem ini menyimpan **data biometrik** (foto wajah) dan **data pribadi** (nama penumpang, NIK/nama KTP, PNR, nomor tiket) — yang diatur ketat oleh **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)**.

| Kategori | Status |
|---|---|
| Arsitektur & fungsionalitas | 🟢 Baik |
| Autentikasi & otorisasi | 🔴 Kritis — secret default, rate-limit mati, brute-force PIN terbuka |
| Perlindungan data (PII/biometrik) | 🔴 Kritis — IDOR, tanpa enkripsi at-rest, tanpa kebijakan retensi/persetujuan |
| Konfigurasi produksi | 🔴 Kritis — `NODE_ENV=development`, DB root tanpa password, tanpa HTTPS |
| Integritas data scan | 🟠 Tinggi — hasil validasi ditentukan klien, backend tidak re-validasi |
| Hygiene (tes, dependensi, monitoring) | 🟠 Sedang |

### Temuan teratas yang WAJIB diperbaiki dulu (blocker):
1. **JWT_SECRET masih nilai default lemah** + fallback `"dev-secret"` → token bisa dipalsukan → ambil alih sistem penuh.
2. **Rate-limiting tidak aktif** (Throttler tidak dipasang) → PIN 4-digit bisa di-brute-force dalam hitungan menit.
3. **IDOR**: operator level terendah bisa melihat **semua** data scan & **mengunduh foto wajah penumpang mana pun**.
4. **Konfigurasi dev di produksi**: `NODE_ENV=development`, MySQL `root` tanpa password, tanpa TLS/HTTPS.
5. **Kredensial bawaan lemah & diketahui** (admin `ChangeMe!2026`, PIN `1234/2345/...`).

---

## 2. Stack Teknologi (hasil identifikasi)

| Lapisan | Teknologi |
|---|---|
| **Frontend** | Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS |
| | Library: `@zxing` (scan barcode), `tesseract.js` (OCR KTP), `leaflet` (peta/radar), `exceljs` (ekspor) |
| | Penyimpanan lokal: `localStorage` + IndexedDB (foto wajah), pola outbox untuk sync offline |
| **Backend** | NestJS 10 + TypeScript |
| | ORM: Prisma 5, DB: **MySQL** (`schema.prisma`), dev via Laragon |
| | Auth: Passport JWT + bcryptjs, validasi: class-validator, dok API: Swagger |
| | Keamanan: helmet, `@nestjs/throttler` (terpasang tapi **tidak aktif** — lihat F-02) |
| **Integrasi** | FIDS bandara (`103.210.122.2`) via proxy server-side; integrasi "Sikeren" |

---

## 3. Daftar Temuan

Skala: 🔴 Kritis · 🟠 Tinggi · 🟡 Sedang · ⚪ Rendah

| ID | Severity | Temuan | Lokasi |
|---|---|---|---|
| F-01 ✅ | 🔴 Kritis | ~~JWT secret default/lemah + fallback `dev-secret`~~ **SELESAI 24 Jun 2026** | [backend/src/auth/jwt.strategy.ts:13](backend/src/auth/jwt.strategy.ts#L13), [backend/.env:5](backend/.env#L5) |
| F-02 ✅ | 🔴 Kritis | ~~Rate-limiting tidak diberlakukan~~ **SELESAI 24 Jun 2026** | [backend/src/app.module.ts:14](backend/src/app.module.ts#L14) |
| F-03 ◑ | 🔴 Kritis | **Gagal-cepat config prod tak aman ✅** + `.env.production.example`; env nyata prod = deployment | [backend/src/main.ts](backend/src/main.ts), [backend/.env.production.example](backend/.env.production.example) |
| F-04 ◑ | 🔴 Kritis | **Seed demo dilewati di prod ✅**; wajib-ganti-password belum | [backend/prisma/seed.ts](backend/prisma/seed.ts) |
| F-05 ✅ | 🟠 Tinggi | ~~IDOR — operator lihat semua scan & foto wajah~~ **SELESAI 24 Jun 2026** | [backend/src/scan-events/scan-events.controller.ts:73](backend/src/scan-events/scan-events.controller.ts#L73), [backend/src/face-photos/face-photos.controller.ts:22](backend/src/face-photos/face-photos.controller.ts#L22) |
| F-06 ◑ | 🟠 Tinggi | **Retensi biometrik ✅** (auto-hapus foto lama); enkripsi at-rest & persetujuan belum (infra/kebijakan) | [backend/src/retention/retention.service.ts](backend/src/retention/retention.service.ts) |
| F-07 | 🟠 Tinggi | Brute-force PIN: 4 digit, tanpa lockout, PIN→operator mana pun | [backend/src/auth/auth.service.ts:51](backend/src/auth/auth.service.ts#L51) |
| F-08 ◑ | 🟠 Tinggi | `resultStatus` kini **divalidasi enum** (`@IsIn`); re-validasi penuh backend belum | [backend/src/scan-events/dto.ts](backend/src/scan-events/dto.ts) |
| F-09 | 🟠 Tinggi | Tanpa HTTPS/TLS — token & data biometrik lewat cleartext | [backend/src/main.ts:36](backend/src/main.ts#L36) |
| F-10 ✅ | 🟡 Sedang | ~~Path traversal nama file upload~~ **SELESAI 24 Jun 2026** (`eventId` di-`@Matches`) | [backend/src/scan-events/dto.ts](backend/src/scan-events/dto.ts) |
| F-11 ◑ | 🟡 Sedang | **Cek `active` tiap request ✅** (akun nonaktif dicabut); cookie HttpOnly/refresh belum | [backend/src/auth/jwt.strategy.ts:17](backend/src/auth/jwt.strategy.ts#L17) |
| F-12 ✅ | 🟡 Sedang | ~~Swagger `/docs` terbuka di produksi~~ **SELESAI 24 Jun 2026** (gated non-prod) | [backend/src/main.ts:33](backend/src/main.ts#L33) |
| F-13 ◑ | ⚪ Rendah | **Endpoint `/health` ✅** (cek DB, skip-throttle); tes otomatis/`npm audit` belum | [backend/src/health.controller.ts](backend/src/health.controller.ts) |

---

## 4. Detail Temuan & Perbaikan

### 🔴 F-01 — JWT secret default/lemah (token bisa dipalsukan) · ✅ SELESAI (24 Jun 2026)
> **Perbaikan diterapkan:** fallback `?? "dev-secret"` dihapus dari [jwt.strategy.ts](backend/src/auth/jwt.strategy.ts) **dan** [auth.module.ts](backend/src/auth/auth.module.ts) — keduanya kini **gagal-cepat** (throw saat boot) bila `JWT_SECRET` kosong/<32 char. `backend/.env` diisi secret acak 48-byte. Token lama otomatis invalid → user re-login (klien auto-logout di 401). Ditambah `PIN_LOOKUP_SECRET` terpisah agar rotasi JWT tidak mengganggu login-PIN.

**Evidensi:**
- [backend/.env:5](backend/.env#L5): `JWT_SECRET="dev-secret-change-me-aaaa..."`
- [backend/src/auth/jwt.strategy.ts:13](backend/src/auth/jwt.strategy.ts#L13): `secretOrKey: cfg.get("JWT_SECRET") ?? "dev-secret"` — fallback ke nilai yang diketahui publik.

**Dampak:** Siapa pun yang tahu secret (nilai default umum/ada di `.env.example`) bisa menandatangani JWT sendiri dengan `role: "admin"` → akses penuh: kelola petugas, hapus penerbangan, baca seluruh data penumpang & foto. Ini kompromi total.

**Perbaikan:**
- Generate secret acak ≥ 32 byte: `openssl rand -base64 48`, simpan hanya di secret manager / env produksi.
- Hapus fallback `?? "dev-secret"` → **gagal-cepat** (crash saat boot) bila `JWT_SECRET` kosong.
- Pertimbangkan pindah ke kunci asimetris (RS256) bila ada beberapa layanan yang memverifikasi token.

### 🔴 F-02 — Rate-limiting dikonfigurasi tapi TIDAK aktif · ✅ SELESAI (24 Jun 2026)
> **Perbaikan diterapkan:** `ThrottlerGuard` didaftarkan sbg `APP_GUARD` global di [app.module.ts](backend/src/app.module.ts) (sebelumnya hanya `ThrottlerModule` diimpor, guard tak pernah dipasang). Endpoint `login` & `login-pin` diberi throttle ketat `@Throttle({ limit: 5, ttl: 60_000 })`. **Terverifikasi**: percobaan login ke-6 dalam 1 menit → HTTP **429**.

**Evidensi:** [backend/src/app.module.ts:14](backend/src/app.module.ts#L14) mengimpor `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])`, **namun `ThrottlerGuard` tidak pernah didaftarkan sebagai `APP_GUARD`** dan tidak ada `@UseGuards(ThrottlerGuard)` di controller mana pun (dikonfirmasi: nihil hasil pencarian `APP_GUARD`/`ThrottlerGuard`). Artinya throttling **tidak berlaku sama sekali**.

**Dampak:** Tidak ada batas laju permintaan. Endpoint `/auth/login` & `/auth/login-pin` bisa di-brute-force tanpa batas. Memperparah F-07.

**Perbaikan:** Daftarkan guard global di `AppModule`:
```ts
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
// providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
```
Tambahkan throttle ketat khusus endpoint login (mis. `@Throttle({ default: { limit: 5, ttl: 60_000 } })`).

### 🔴 F-03 — Konfigurasi produksi belum disiapkan · ◑ SEBAGIAN (24 Jun 2026)
> **Perbaikan diterapkan:** [main.ts](backend/src/main.ts) kini **gagal-cepat saat `NODE_ENV=production`** bila `CORS_ORIGIN` localhost/kosong atau `DATABASE_URL` memakai user `root`. Disediakan template [.env.production.example](backend/.env.production.example) (user DB non-root, CORS domain resmi, secret kuat). **Belum:** mengisi env produksi nyata + membuat user DB berhak-minimal = langkah **deployment**.

**Evidensi:** [backend/.env](backend/.env): `NODE_ENV="development"`, `DATABASE_URL="mysql://root@127.0.0.1:3306/afvs"` (user `root`, **tanpa password**), `CORS_ORIGIN="http://localhost:3000"`.

**Dampak:** Mode dev mengaktifkan pesan error verbose, DB root tanpa password = akses penuh database bila server tersusupi, CORS menunjuk localhost.

**Perbaikan:** Profil `.env.production` terpisah: `NODE_ENV=production`, user DB khusus dengan hak minimal + password kuat, `CORS_ORIGIN` ke domain frontend resmi (HTTPS). Jangan pernah pakai `root` untuk aplikasi.

### 🔴 F-04 — Kredensial bawaan lemah & dapat ditebak · ◑ SEBAGIAN (24 Jun 2026)
> **Perbaikan diterapkan:** [seed.ts](backend/prisma/seed.ts) **melewati seed akun/PIN demo bila `NODE_ENV=production`** (kecuali `SEED_ALLOW_DEMO=true`) — kredensial demo (`ChangeMe!2026`, PIN `1234`…) tak akan lolos ke produksi. **Belum:** mekanisme **wajib-ganti-password saat login pertama** (perlu kolom + alur UI, rencana terpisah).

**Evidensi:** [backend/prisma/seed.ts:41](backend/prisma/seed.ts#L41): admin `ChangeMe!2026`, operator `operator123`, dan PIN AVSEC berurutan `1234, 2345, 3456, 4567, 5678` ([seed.ts:56](backend/prisma/seed.ts#L56)).

**Dampak:** Kredensial demo ini sering lolos ke produksi. PIN berurutan = tebakan pertama berhasil.

**Perbaikan:** Untuk produksi, jangan seed akun demo. Wajibkan ganti password saat login pertama. Generate PIN acak (kode sudah punya `generateUniquePin()` — gunakan itu, jangan PIN hardcoded).

### 🟠 F-05 — IDOR: paparan data scan & foto wajah lintas-petugas · ✅ SELESAI (24 Jun 2026)
> **Perbaikan diterapkan:** scoping berbasis station/role. Di [scan-events.service.ts](backend/src/scan-events/scan-events.service.ts): `list()` mengunci **operator** ke `station`-nya (filter station dari klien diabaikan); `findByEventId()` membalas **404** bila operator mengakses scan station lain. Di [face-photos.controller.ts](backend/src/face-photos/face-photos.controller.ts): foto wajah hanya untuk operator station yang sama (404 lintas-station, biometrik/PII). Supervisor/admin tetap bebas lintas-station. **Terverifikasi**: admin lihat semua; operator SCP2 hanya station-nya; operator akses event station lain → **404**.

**Evidensi:**
- [scan-events.controller.ts:73](backend/src/scan-events/scan-events.controller.ts#L73) — `GET /scan-events` & `GET /scan-events/:eventId` hanya butuh `JwtAuthGuard`. **Tanpa scoping per-station/role.** Operator station "SCP2" bisa menarik seluruh riwayat semua station: nama penumpang, PNR, nomor tiket, nama KTP, skor kemiripan.
- [face-photos.controller.ts:22](backend/src/face-photos/face-photos.controller.ts#L22) — `GET /face-photos/:eventId` mengembalikan **foto wajah penumpang mana pun** ke setiap user terautentikasi. `eventId` dapat ditebak/dienumerasi.

**Dampak:** Satu akun operator/PIN yang bocor = ekspos massal data biometrik & PII seluruh penumpang. Pelanggaran berat UU PDP.

**Perbaikan:** Terapkan otorisasi berbasis kepemilikan/station: operator hanya boleh akses data station-nya sendiri (dari `req.user.station`); akses lintas-station hanya untuk `supervisor`/`admin`. Tambah audit-log pada setiap akses foto.

### 🟠 F-06 — Data biometrik/PII tanpa enkripsi, retensi, & persetujuan (UU PDP) · ◑ SEBAGIAN (24 Jun 2026)
> **Perbaikan diterapkan (retensi):** [RetentionService](backend/src/retention/retention.service.ts) (terdaftar di AppModule) **memusnahkan otomatis foto wajah** (data biometrik) yang lebih lama dari `FACE_RETENTION_DAYS` (default 30) — hapus file + kosongkan `facePhotoPath`; record scan tetap utuh untuk audit. Jalan 10 dtk pasca-boot lalu tiap 12 jam (timer `unref`). Terverifikasi boot bersih tanpa error.
> **Belum (di luar kode aplikasi):** enkripsi at-rest (disk/object-storage terenkripsi = ranah infra), mekanisme **persetujuan/pemberitahuan** penumpang & dasar hukum pemrosesan (ranah kebijakan/DPO). Pertimbangkan juga redaksi PII teks (nama/PNR) bila retensi mensyaratkan.

**Evidensi:** Foto wajah disimpan plaintext di disk ([scan-events.controller.ts:40](backend/src/scan-events/scan-events.controller.ts#L40), `uploads/<tanggal>/<eventId>.jpg`); `ScanEvent` menyimpan `passengerName`, `ktpName`, `ktpSimilarity` tanpa enkripsi ([schema.prisma:53](backend/prisma/schema.prisma#L53)).

**Dampak:** Data wajah = **data pribadi spesifik** (UU PDP Pasal 4). Wajib: dasar pemrosesan yang sah (persetujuan/penugasan hukum), minimisasi data, enkripsi, kebijakan retensi & penghapusan, serta pencatatan. Saat ini tidak ada satupun.

**Perbaikan:**
- Tetapkan dasar hukum & **mekanisme persetujuan/pemberitahuan** penumpang.
- Enkripsi at-rest (disk terenkripsi / object storage terenkripsi) + akses terkontrol.
- Kebijakan **retensi** (mis. hapus otomatis foto setelah N hari) + job pembersihan.
- Catat di Rekaman Kegiatan Pemrosesan; siapkan prosedur permintaan subjek data.

### 🟠 F-07 — PIN mudah di-brute-force
**Evidensi:** [auth.service.ts:51](backend/src/auth/auth.service.ts#L51) — `loginPin` membandingkan PIN ke **semua** operator aktif. PIN 4–6 digit ([dto.ts:18](backend/src/auth/dto.ts#L18)). Ruang 4-digit hanya 10.000 kombinasi; tanpa lockout, dan rate-limit mati (F-02).

**Dampak:** Satu PIN valid cukup untuk login sebagai operator mana pun. Brute-force selesai dalam menit.

**Perbaikan:** Aktifkan throttle ketat (F-02), tambah lockout per-IP/akun, panjang PIN minimal 6 digit, dan idealnya kaitkan PIN dengan identitas (mis. pilih nama dulu, baru PIN) agar bukan pencarian global.

### 🟠 F-08 — Integritas hasil scan bergantung pada klien · ◑ SEBAGIAN (24 Jun 2026)
> **Perbaikan diterapkan:** `resultStatus` kini divalidasi **enum** `@IsIn([...])` di [scan-events/dto.ts](backend/src/scan-events/dto.ts) — klien tak bisa mengirim status sembarang. **Belum:** backend belum **mem-validasi ulang** barcode terhadap data penerbangan (masih memercayai keputusan klien untuk isi status). Itu butuh logika validasi di server (rencana terpisah).

**Evidensi:** Validasi barcode terjadi di klien ([src/lib/scanService.ts:148](src/lib/scanService.ts#L148)); backend menerima `resultStatus` apa adanya sebagai string ([scan-events.service.ts:51](backend/src/scan-events/scan-events.service.ts#L51), DTO hanya `@IsString()`).

**Dampak:** Klien yang dimodifikasi bisa mengirim `resultStatus: "VALID_FLIGHT"` untuk barcode palsu. Untuk sistem yang tujuannya audit/validasi keamanan bandara, catatan menjadi tidak dapat dipercaya.

**Perbaikan:** Validasi `resultStatus` sebagai enum (`@IsIn([...])`). Idealnya backend **mem-validasi ulang** barcode terhadap data penerbangan resmi alih-alih memercayai keputusan klien.

### 🟠 F-09 — Tanpa HTTPS/TLS · ⛏️ INFRA (panduan disiapkan)
> **Status:** murni infra — tak bisa ditutup di kode aplikasi. Langkah konkret (Nginx + Certbot, redirect 80→443) ada di [nestjs-deploy.md §0 & §6](nestjs-deploy.md). **HSTS sudah aktif** dari helmet (terverifikasi di test: header `Strict-Transport-Security` ada). Tinggal pasang TLS saat deploy.

**Evidensi:** Backend `app.listen(port)` HTTP polos ([main.ts:36](backend/src/main.ts#L36)); CORS origin `http://`.

**Dampak:** Token JWT, PIN, foto wajah, dan PII lewat jaringan tanpa enkripsi → rawan sniffing di jaringan bandara.

**Perbaikan:** Terminasi TLS di reverse proxy (nginx/Caddy) atau load balancer; paksa HTTPS end-to-end; aktifkan HSTS (helmet sudah ada, konfigurasi HSTS).

### 🟡 F-10 — Path traversal pada nama file upload · ✅ SELESAI (24 Jun 2026)
> **Perbaikan diterapkan:** `eventId` di [scan-events/dto.ts](backend/src/scan-events/dto.ts) kini di-`@Matches(/^[A-Za-z0-9_-]+$/)` — menolak `../`/pemisah path sebelum dipakai sbg nama file. (Klien memang menghasilkan cuid alfanumerik, jadi tak ada yang rusak.) _Validasi tipe gambar via magic-byte masih disarankan menyusul._

**Evidensi:** [scan-events.controller.ts:46](backend/src/scan-events/scan-events.controller.ts#L46) — `filename` = `${eventId}${extname(originalname)}`. `eventId` hanya `@IsString() @MaxLength(64)` ([dto.ts:15](backend/src/scan-events/dto.ts#L15)) — tidak menyaring `../` atau pemisah path. Jenis file dipercaya dari `mimetype` klien (bukan magic byte).

**Dampak:** `eventId` jahat (mis. `../../x`) dapat menulis file di luar direktori target; file lalu diserve via `res.sendFile(path, { root: "." })` ([face-photos.controller.ts:31](backend/src/face-photos/face-photos.controller.ts#L31)).

**Perbaikan:** Sanitasi/whitelist `eventId` (mis. `@Matches(/^[A-Za-z0-9_-]+$/)`), atau buat nama file dari UUID server-side. Validasi tipe gambar via magic bytes, bukan mimetype klien.

### 🟡 F-11 — Token di localStorage & tanpa pencabutan · ◑ SEBAGIAN (24 Jun 2026)
> **Perbaikan diterapkan:** [jwt.strategy.ts](backend/src/auth/jwt.strategy.ts) `validate()` kini **cek status `active` operator di DB tiap request** — akun yang dinonaktifkan/dihapus **langsung kehilangan akses** (tak menunggu token kedaluwarsa). **Terverifikasi**: nonaktifkan operator → request token-nya jadi **401**; aktifkan lagi → 200. **Belum:** pindah token ke cookie `HttpOnly`+`Secure` & refresh-token (mengurangi risiko XSS — rencana terpisah).

**Evidensi:** [client.ts:67](src/lib/api/client.ts#L67) menyimpan JWT di `localStorage`; [jwt.strategy.ts:17](backend/src/auth/jwt.strategy.ts#L17) hanya mengembalikan payload (tanpa cek DB), token berlaku 12 jam tanpa daftar-cabut.

**Dampak:** Rawan pencurian token via XSS. Operator yang dinonaktifkan/dihapus tetap bisa beroperasi hingga token kedaluwarsa.

**Perbaikan:** Pertimbangkan cookie `HttpOnly`+`Secure`+`SameSite`; perpendek masa token + refresh token; cek status `active` operator di `JwtStrategy.validate`; sediakan mekanisme blacklist/rotasi.

### 🟡 F-12 — Swagger `/docs` terbuka di produksi · ✅ SELESAI (24 Jun 2026)
> **Perbaikan diterapkan:** setup Swagger di [main.ts](backend/src/main.ts) dibungkus `if (process.env.NODE_ENV !== "production")` — `/docs` tidak terpasang di produksi.

**Evidensi:** [main.ts:33](backend/src/main.ts#L33) memasang Swagger tanpa syarat lingkungan.

**Dampak:** Membuka peta lengkap permukaan serang ke publik.

**Perbaikan:** Bungkus dengan `if (process.env.NODE_ENV !== "production")` atau lindungi dengan auth.

### ⚪ F-13 — Hygiene: tes, health-check, pemindaian dependensi · ◑ SEBAGIAN (24 Jun 2026)
> **Perbaikan diterapkan:** endpoint **`GET /health`** ([health.controller.ts](backend/src/health.controller.ts)) — cek konektivitas DB, publik & `@SkipThrottle` untuk monitoring/uptime. **Terverifikasi**: `{status:"ok",db:true}`. **Belum:** tes otomatis + CI, `npm audit` rutin.

- Tidak ada berkas tes di backend; tidak ada CI.
- `apiHealth()` ([client.ts:467](src/lib/api/client.ts#L467)) memprobe `OPTIONS /auth/login` — sebaiknya ada endpoint `/health` khusus.
- Jalankan `npm audit` rutin; `multer@1.x` punya riwayat kerentanan — pantau/upgrade.
- Komentar `schema.prisma` menyebut SQLite padahal provider `mysql` — perbaiki dokumentasi.

---

## 5. Kepatuhan UU PDP (No. 27/2022) — ringkas

Karena sistem memproses **data pribadi & data pribadi spesifik (biometrik wajah)**, minimal diperlukan:

- [ ] Dasar pemrosesan yang sah (persetujuan eksplisit / kewajiban hukum / kepentingan publik).
- [ ] Pemberitahuan privasi kepada penumpang (tujuan, retensi, hak subjek data).
- [ ] Minimisasi data — simpan hanya yang perlu; pertimbangkan tidak menyimpan foto bila tak wajib.
- [ ] Enkripsi at-rest & in-transit (lihat F-06, F-09).
- [x] ✅ Kebijakan retensi & penghapusan otomatis — biometrik (foto wajah) auto-hapus `FACE_RETENTION_DAYS` (F-06). *(pertimbangkan retensi untuk PII teks juga)*
- [ ] Kontrol akses berbasis peran + audit-log akses data (lihat F-05).
- [ ] Penunjukan penanggung jawab (DPO bila wajib) & prosedur penanganan insiden/kebocoran.

> Catatan: ini ringkasan teknis, **bukan nasihat hukum**. Libatkan tim hukum/DPO instansi sebelum go-live.

---

## 6. Checklist Kelayakan Deploy (Go / No-Go)

### 🔴 Blocker — wajib selesai sebelum deploy
- [x] ✅ F-01 — `JWT_SECRET` acak kuat, hapus fallback, gagal-cepat bila kosong. *(24 Jun 2026)*
- [x] ✅ F-02 — Aktifkan `ThrottlerGuard` global + throttle ketat di endpoint login. *(24 Jun 2026)*
- [◑] F-03 — ✅ gagal-cepat config prod + `.env.production.example`; ⬜ isi env nyata + user DB non-root (deployment). *(24 Jun 2026)*
- [◑] F-04 — ✅ skip seed demo di prod; ⬜ wajib-ganti-password login pertama. *(24 Jun 2026)*
- [x] ✅ F-05 — Scoping otorisasi per-station/role pada scan-events & face-photos. *(24 Jun 2026)*
- [ ] F-09 — HTTPS/TLS end-to-end + HSTS.

### 🟠 Tinggi — sangat disarankan sebelum menangani data riil
- [◑] F-06 — ✅ retensi auto-hapus biometrik; ⬜ enkripsi at-rest (infra) + persetujuan (kebijakan). *(24 Jun 2026)*
- [ ] F-07 — Lockout & penguatan PIN.
- [◑] F-08 — ✅ Validasi `resultStatus` (enum); ⬜ re-validasi backend. *(24 Jun 2026)*

### 🟡 Sedang — perbaiki secepatnya
- [◑] F-10 — ✅ Sanitasi nama file upload (`@Matches`); ⬜ cek magic byte. *(24 Jun 2026)*
- [◑] F-11 — ✅ cek `active` tiap request (revocation); ⬜ cookie HttpOnly/refresh. *(24 Jun 2026)*
- [x] ✅ F-12 — Batasi Swagger di produksi. *(24 Jun 2026)*

### ⚪ Rendah — kualitas berkelanjutan
- [◑] F-13 — ✅ endpoint `/health` (+ komentar skema diperbaiki via AUDIT-PERFORMA P-18); ⬜ tes otomatis/CI, `npm audit`. *(24 Jun 2026)*

---

## 7. Hal yang Sudah Baik 👍

Agar seimbang, beberapa praktik keamanan sudah benar:
- Password & PIN disimpan **ter-hash bcrypt**, tidak pernah diekspos (`SAFE_SELECT` di [operators.service.ts:18](backend/src/operators/operators.service.ts#L18)).
- `ValidationPipe` dengan `whitelist` + `forbidNonWhitelisted` ([main.ts:17](backend/src/main.ts#L17)) — menolak field asing.
- `helmet()` aktif; CORS tidak wildcard.
- Proxy FIDS server-side mencegah SSRF/open-proxy & masalah mixed-content ([route.ts:24](src/app/api/jadwal/[jenis]/route.ts#L24)).
- Push scan **idempoten** (anti-duplikasi) & soft-delete operator yang punya riwayat (jejak audit terjaga, [operators.service.ts:130](backend/src/operators/operators.service.ts#L130)).
- `.env`/`uploads/` sudah di-`.gitignore` dan **tidak** ter-commit (terverifikasi).

---

## 8. Rekomendasi Urutan Pengerjaan

1. **Hari 1 (blocker auth/config):** F-01, F-02, F-03, F-04 — cepat & berdampak besar.
2. **Hari 2–3 (data & transport):** F-05, F-09, lalu F-06 (retensi/enkripsi).
3. **Minggu 1 (integritas & hardening):** F-07, F-08, F-10, F-11, F-12.
4. **Berkelanjutan:** F-13 + audit UU PDP bersama tim hukum.

---

## 9. Log Implementasi

Perbaikan keamanan yang sudah dikerjakan dari audit ini.

| Tgl | Item | Yang dilakukan | Verifikasi |
|---|---|---|---|
| 24 Jun 2026 | **F-06** | `RetentionService`: auto-hapus foto wajah (biometrik) >`FACE_RETENTION_DAYS` (30) + kosongkan path; 12 jam sekali. | Boot bersih, jalan tanpa error (0 dihapus — data demo masih baru). |
| 24 Jun 2026 | **F-05** | Scoping station/role: `list`/`findByEventId`/face-photo dikunci ke station operator (404 lintas-station); supervisor/admin bebas. | Diuji: admin lihat semua; operator hanya station-nya; akses lintas-station → **404**. |
| 24 Jun 2026 | **F-02** | `ThrottlerGuard` global (`APP_GUARD`) + `@Throttle(5/menit)` di login & login-pin. | Login ke-6/menit → **HTTP 429** (diuji). |
| 24 Jun 2026 | **F-01** | Hapus fallback `dev-secret`; gagal-cepat bila `JWT_SECRET`<32 char (strategy + module); `.env` secret acak 48-byte; `PIN_LOOKUP_SECRET` terpisah. | Backend boot OK; login-pin OK pasca rotasi (self-healing). |
| 24 Jun 2026 | **F-12** | Swagger di-`if (NODE_ENV!=="production")`. | Backend `tsc` lolos. |
| 24 Jun 2026 | **F-10** | `eventId` `@Matches(/^[A-Za-z0-9_-]+$/)` (anti path-traversal). | Backend `tsc` lolos. |
| 24 Jun 2026 | **F-11** | `JwtStrategy.validate` cek `active` operator tiap request (cabut akses instan). | Diuji: nonaktif → **401**, aktif lagi → 200. |
| 24 Jun 2026 | **F-13** | Endpoint `GET /health` (cek DB, `@SkipThrottle`). | Diuji: `{status:"ok",db:true}`. |
| 24 Jun 2026 | **F-03** | Gagal-cepat saat `NODE_ENV=production` bila CORS localhost / DB root; `.env.production.example`. | Backend `tsc` lolos. |
| 24 Jun 2026 | **F-04** | Seed melewati akun/PIN demo bila `NODE_ENV=production` (kecuali `SEED_ALLOW_DEMO`). | Backend `tsc` lolos. |
| 24 Jun 2026 | **F-08** | `resultStatus` `@IsIn([...])` (validasi enum). Re-validasi backend belum. | Backend `tsc` lolos. |

> **Catatan migrasi F-01:** mengganti `JWT_SECRET` meng-invalidasi token lama (user re-login — klien auto-logout di 401). `pinLookup` (P-05/P-06) yang dibuat dengan secret lama otomatis di-backfill ulang saat login (jalur legacy diperbaiki agar menangani nilai stale).

**Sisa (sebagian besar di luar kode aplikasi):**
- **Infra/deployment:** F-09 (HTTPS/TLS reverse proxy), enkripsi at-rest F-06, isi `.env.production` + user DB non-root F-03.
- **Kebijakan/hukum:** persetujuan & dasar pemrosesan PDP (F-06), DPO/prosedur insiden.
- **Kode menyusul (opsional):** F-08 re-validasi barcode di backend, F-04 wajib-ganti-password, F-11 cookie HttpOnly, F-13 tes/CI, F-10 magic-byte, F-07 lockout PIN.
> Semua blocker keamanan yang **bisa diselesaikan di kode aplikasi** sudah ditangani. F-07 sebagian tertutup P-05/P-06 (PIN tak lagi di-scan global).

---
*Dokumen ini dibuat sebagai modul audit internal. Setelah blocker (Bagian 6) ditutup, lakukan uji penetrasi pihak ketiga sebelum go-live di bandara.*
