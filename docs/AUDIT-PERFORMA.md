# Audit Performa & Index Database — AFVS

**Aplikasi:** Airport Flight Validation System (AFVS / "si-pandai")
**Tanggal audit:** 24 Juni 2026
**Auditor:** Tinjauan kode otomatis (Claude)
**Konteks:** Audit kecepatan/stabilitas frontend (Next.js) + efisiensi query & index database (Prisma/MySQL). Pendamping dari [AUDIT-KEAMANAN.md](AUDIT-KEAMANAN.md).

---

## 1. Ringkasan Eksekutif

### Verdict: 🟡 **CUKUP CEPAT untuk data kecil, tapi akan melambat saat data/petugas bertambah & di perangkat kiosk lemah**

Aplikasi terasa ringan saat dataset kecil karena sebagian besar logika berjalan di `localStorage` (tanpa round-trip jaringan). **Namun ada beberapa _bottleneck_ yang biaya-nya tumbuh seiring jumlah scan/penerbangan/petugas, plus pemborosan aset & polling yang terus berjalan di semua halaman.** Tidak ada blocker keamanan di sini, tapi 4 temuan 🔴 berdampak langsung ke responsivitas (terutama mode kiosk yang dipakai terus-menerus) dan ke biaya transfer di jaringan bandara.

| Kategori | Status |
|---|---|
| Index & skema database | 🟢 Baik — index inti sudah ada; 1–2 index tambahan & 2 pola query perlu dirapikan |
| Efisiensi query backend | 🟠 Tinggi — login-PIN & generate-PIN berskala O(N) bcrypt (CPU-bound) |
| Aset frontend (gambar) | 🔴 Kritis — PNG 1–2 MB diserve mentah via `<img>`, logo maskapai ~1 MB per baris |
| Render & komputasi klien | 🔴 Kritis — komputasi O(penerbangan×scan) + polling berat always-on (kiosk, InsightBubble) |
| Jaringan / fetch | 🔴 Kritis — proxy jadwal menarik seluruh FIDS sekuensial (≤50 round-trip) tanpa cache |
| Bundling / konfigurasi | 🟠 Tinggi — `next.config.js` nyaris kosong, tanpa optimasi paket/gambar |

### Temuan teratas yang paling berdampak:
1. **Gambar raksasa via `<img>` mentah** — total ~20 MB PNG di `public/`, logo maskapai ~1 MB dirender per baris list. (P-01)
2. **Mode kiosk over-polling** — refresh tiap 3 dtk yang mem-`parse` localStorage **dua kali** + 5 timer paralel → re-render kaskade konstan. (P-02)
3. **InsightBubble** membangun ulang laporan O(penerbangan×scan) + 4× parse localStorage **tiap 30 dtk di semua halaman**. (P-03)
4. **Proxy `/api/jadwal`** menarik seluruh dataset FIDS halaman-demi-halaman (sekuensial, ≤50 request) tanpa cache, lalu filter tanggal setelahnya. (P-04)
5. **login-PIN** membandingkan PIN ke **semua** operator aktif dengan bcrypt (CPU ~80 ms/operator) → makin lambat tiap tambah petugas. (P-05)

---

## 2. Stack & Titik Ukur (hasil identifikasi)

| Lapisan | Teknologi & catatan performa |
|---|---|
| **Frontend** | Next.js 14 (App Router) + React 18. Mayoritas state di `localStorage`/IndexedDB. Library berat (`tesseract.js`, `leaflet`, `exceljs`, `@zxing`) **sudah lazy-load** — bagus. |
| **Backend** | NestJS 10 + Prisma 5. Query list sudah paginasi + filter server-side. |
| **Database** | MySQL (`schema.prisma` provider `mysql`, [backend/.env:2](../backend/.env#L2)). Index inti sudah didefinisikan. |
| **Integrasi** | Proxy FIDS server-side (`/api/jadwal`) — hotspot latensi terbesar. Outbox sync (20–30 dtk). |

> Catatan metodologi: angka "O(N)" di bawah adalah _kompleksitas_, bukan hasil benchmark. Belum ada perf budget / Lighthouse CI / EXPLAIN di repo (lihat P-18). Rekomendasi: jalankan Lighthouse pada `/dashboard` & `/scan/kiosk`, dan `EXPLAIN` pada query list saat data >10 rb baris.

---

## 3. Daftar Temuan

Skala: 🔴 Kritis · 🟠 Tinggi · 🟡 Sedang · ⚪ Rendah
Kolom **Area**: FE = frontend, BE = backend, DB = database.

| ID | Severity | Area | Temuan | Lokasi |
|---|---|---|---|---|
| P-01 ✅ | 🔴 Kritis | FE | ~~Aset PNG 1–2 MB via `<img>`~~ **SELESAI 24 Jun 2026** (WebP −97%; `next/image` opsional) | [src/components/ui/AirlineLogo.tsx:109](../src/components/ui/AirlineLogo.tsx#L109), [src/components/dashboard/AirportHero.tsx:28](../src/components/dashboard/AirportHero.tsx#L28) |
| P-02 ✅ | 🔴 Kritis | FE | ~~Kiosk: refresh 3 dtk parse 2× + tanpa visibility-gate~~ **SELESAI 24 Jun 2026** | [src/app/scan/kiosk/page.tsx:381](../src/app/scan/kiosk/page.tsx#L381) |
| P-03 ✅ | 🔴 Kritis | FE | ~~InsightBubble rebuild tiap 30 dtk di semua halaman~~ **SELESAI 24 Jun 2026** | [src/components/insights/InsightBubble.tsx:131](../src/components/insights/InsightBubble.tsx#L131) |
| P-04 ✅ | 🔴 Kritis | FE/BE | ~~Proxy jadwal fetch FIDS sekuensial tanpa cache~~ **SELESAI 24 Jun 2026** | [src/lib/jadwal/source.ts:219](../src/lib/jadwal/source.ts#L219), [src/app/api/jadwal/[jenis]/route.ts:22](../src/app/api/jadwal/[jenis]/route.ts#L22) |
| P-05 ✅ | 🟠 Tinggi | BE | ~~login-PIN O(N) bcrypt tiap login~~ **SELESAI 24 Jun 2026** | [backend/src/auth/auth.service.ts:51](../backend/src/auth/auth.service.ts#L51) |
| P-06 ✅ | 🟠 Tinggi | BE | ~~Tambah/Reset PIN O(50×N) bcrypt~~ **SELESAI 24 Jun 2026** | [backend/src/operators/operators.service.ts:169](../backend/src/operators/operators.service.ts#L169) |
| P-07 ✅ | 🟠 Tinggi | FE | ~~`getBoardingProgress` per-penerbangan → O(penerbangan×scan)~~ **SELESAI 24 Jun 2026** | [src/lib/boarding.ts:9](../src/lib/boarding.ts#L9), [src/app/dashboard/page.tsx:344](../src/app/dashboard/page.tsx#L344) |
| P-08 ✅ | 🟠 Tinggi | FE | ~~admin/scans render 200 baris + 200 fetch foto serentak~~ **SELESAI 24 Jun 2026** | [src/app/admin/scans/page.tsx:221](../src/app/admin/scans/page.tsx#L221) |
| P-09 ✅ | 🟠 Tinggi | FE | ~~`storage.ts` parse ulang koleksi tiap getter~~ **SELESAI 24 Jun 2026** | [src/lib/storage.ts:23](../src/lib/storage.ts#L23) |
| P-10 ✅ | 🟠 Tinggi | FE | ~~`next.config.js` nyaris kosong~~ **SELESAI 24 Jun 2026** | [next.config.js:2](../next.config.js#L2) |
| P-11 ✅ | 🟡 Sedang | DB | ~~Index hilang: `ScanEvent.flightNumber` & `scannedAt`~~ **SELESAI 24 Jun 2026** | [backend/prisma/schema.prisma:81](../backend/prisma/schema.prisma#L81) |
| P-12 | 🟡 Sedang | DB | Offset pagination (`skip`/`take`) melambat di halaman dalam saat data besar | [backend/src/scan-events/scan-events.service.ts:80](../backend/src/scan-events/scan-events.service.ts#L80) |
| P-13 | 🟡 Sedang | FE | ⏭️ **DILEWATI** — komponen kamera selalu ter-mount (prop `open`); `dynamic` tak menunda tanpa ubah perilaku; lib berat sudah lazy | [src/app/scan/page.tsx:27](../src/app/scan/page.tsx#L27) |
| P-14 ✅ | 🟡 Sedang | FE | ~~SW cache-first tanpa expiry untuk aset publik~~ **SELESAI 24 Jun 2026** | [public/sw.js:60](../public/sw.js#L60) |
| P-15 ✅ | 🟡 Sedang | FE | ~~Jam AppShell re-render seluruh shell tiap 1 dtk~~ **SELESAI 24 Jun 2026** | [src/components/layout/AppShell.tsx:219](../src/components/layout/AppShell.tsx#L219) |
| P-16 ✅ | 🟡 Sedang | FE | ~~API client tanpa dedup + hardcap `perPage:200`~~ **SELESAI 24 Jun 2026** | [src/lib/api/flightSync.ts:72](../src/lib/api/flightSync.ts#L72) |
| P-17 | ⚪ Rendah | DB/BE | Query list tanpa `select` projection → over-fetch semua kolom (mis. `rawBarcode`) | [backend/src/scan-events/scan-events.service.ts:83](../backend/src/scan-events/scan-events.service.ts#L83) |
| P-18 ◑ | ⚪ Rendah | — | ~~`scanEventsArchive` tak dipangkas + komentar skema salah~~ **SEBAGIAN SELESAI** (cap arsip + komentar); Lighthouse/monitoring belum | (repo) |

---

## 4. Detail Temuan & Perbaikan

### 🔴 P-01 — Aset gambar raksasa diserve mentah via `<img>` · ✅ SELESAI (24 Jun 2026)
> **Implementasi (sub-langkah 3a — kompres):** semua PNG di `public/airlines/` & `public/asset-cards/` di-konversi ke **WebP** (logo maks 160px, background maks 1280px) via `sharp`. **Hasil: 19.169 KB → 606 KB (−97%, hemat ~18,5 MB).** Logo ~1 MB → 2–4,6 KB; background ~1,5 MB → 11–90 KB. PNG asli **disimpan** sebagai cadangan.
> **Implementasi (sub-langkah 3b — kode):** 9 referensi `.png` → `.webp` di 4 file: [airlines.ts](../src/lib/airlines.ts) (6 logo), [AirportHero.tsx:29](../src/components/dashboard/AirportHero.tsx#L29), [flights/page.tsx:733](../src/app/flights/page.tsx#L733), [analytics/page.tsx:420](../src/app/analytics/page.tsx#L420). Terverifikasi: semua `.webp` ada, tidak ada sisa referensi `.png`.
> **Sisa (opsional, dampak kecil sekarang):** migrasi `<img>` → `next/image` untuk lazy-load + srcset responsif. Karena tiap gambar kini sudah kecil (logo 3 KB), urgensinya turun drastis — bisa dilakukan belakangan.
> **Catatan kebersihan:** `sharp` dipasang `--no-save` (tidak masuk package.json). Aset `mode-kiosk`, `sidebar-dark/light`, `tata-cara1–4` ternyata **tidak direferensikan** di kode (kandidat dihapus untuk merampingkan repo — terpisah).

**Evidensi (sebelum):** `public/asset-cards/` ~15 MB & `public/airlines/` ~4.8 MB. Logo maskapai berukuran ~1 MB (`GA.png` 964 KB, `ID.png` 1.06 MB, `IW.png` 1.0 MB) dirender via `<img src={meta.logoSrc}>` di [AirlineLogo.tsx:109](../src/components/ui/AirlineLogo.tsx#L109) — **per baris** di list flights/passengers/scan-events. Background 1–2 MB di [AirportHero.tsx:28](../src/components/dashboard/AirportHero.tsx#L28) dan banyak `<img>` di kiosk/analytics/scan-events. Hanya 2 file pakai `next/image`.

**Dampak:** Puluhan MB transfer + dekode tiap buka dashboard/list. Di jaringan bandara/perangkat lemah ini terasa berat & menghabiskan kuota. Logo 1 MB yang seharusnya <10 KB adalah pemborosan terbesar.

**Perbaikan:**
- **Kompres + resize** semua aset sekarang juga: logo → ~128 px WebP (<10 KB), background → WebP ~1280 px (<150 KB). Ini perbaikan dampak-tertinggi dan paling cepat.
- Migrasi `<img>` aset statis → `next/image` (auto-resize, lazy, AVIF/WebP, `sizes`).
- `<img>` untuk foto wajah/KTP dari blob runtime ([FaceThumb.tsx:101](../src/components/scan/FaceThumb.tsx#L101)) **wajar** dibiarkan — bukan aset statis.

### 🔴 P-02 — Mode kiosk over-polling & dobel-parse localStorage · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** di [kiosk/page.tsx](../src/app/scan/kiosk/page.tsx) fungsi `refresh()` kini (1) memanggil `getFlights()` **sekali** lalu memakai ulang hasilnya (sebelumnya 2×), (2) **skip total** saat `document.visibilityState !== "visible"`, dan (3) interval dinaikkan **3 dtk → 5 dtk** (−40% siklus). Timer lain (jam 1s, face-HUD 250ms) dibiarkan karena memang dibutuhkan saat kamera aktif. Hasil benchmark: lihat Bagian 9.3.

**Evidensi (sebelum):** [kiosk/page.tsx:381](../src/app/scan/kiosk/page.tsx#L381) — interval 3 dtk memanggil `getFlights()` **dua kali** + `getScanEvents()` sekali, tiap kali parse penuh array dari localStorage lalu `setState` (re-render). Halaman kiosk juga menjalankan **5 timer bersamaan**: jam 1 dtk ([:366](../src/app/scan/kiosk/page.tsx#L366)), refresh data 3 dtk ([:381](../src/app/scan/kiosk/page.tsx#L381)), focus-steal 500 ms ([:396](../src/app/scan/kiosk/page.tsx#L396)), face-HUD poll 250 ms = 4×/dtk ([:456](../src/app/scan/kiosk/page.tsx#L456)).

**Dampak:** Halaman terberat aplikasi (kamera + OCR) terus re-render. Kiosk dipakai berjam-jam non-stop → akumulasi GC & jank. Dobel `getFlights()` membuang setengah kerja parse.

**Perbaikan:** Panggil tiap getter **sekali** per siklus dan simpan hasilnya; jangan parse 2×. Naikkan interval refresh data ke 5–10 dtk (atau berbasis event `afvs:flights-updated`). Gabungkan/turunkan frekuensi face-HUD bila tidak ada wajah. Hentikan polling saat `document.visibilityState !== "visible"`.

### 🔴 P-03 — InsightBubble membangun laporan berat tiap 30 dtk di SEMUA halaman · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** di [InsightBubble.tsx](../src/components/insights/InsightBubble.tsx) `refresh()` kini **skip** saat `document.visibilityState !== "visible"` (tidak rebuild laporan saat tab disembunyikan) dan interval dinaikkan **30 dtk → 60 dtk**. Badge tetap tampil (build awal saat mount) & disegarkan oleh event `focus`/`afvs:settings` saat user kembali. Laporan juga otomatis lebih ringan berkat P-07. `tsc` lolos. Hasil: lihat Bagian 9.4.

**Evidensi (sebelum):** [InsightBubble.tsx:131](../src/components/insights/InsightBubble.tsx#L131) — interval 30 dtk + listener `focus`/`afvs:settings` bump `version`, memicu `buildReportVersion()` yang memanggil `getFlights()` + `getScanEvents()` + `getAuditEvents()` + `getSettings()` (**4 parse localStorage penuh**) lalu `buildAppInsightReport()` ([insights.ts:62](../src/lib/insights.ts#L62)) yang multi-pass + `getBoardingProgress` per-penerbangan (lihat P-07). InsightBubble dirender lewat AppShell → **always-on di setiap route**.

**Dampak:** Beban CPU + 4 parse localStorage tiap 30 dtk walau user diam, di semua halaman. Pada data besar, ini lonjakan jank berkala.

**Perbaikan:** Jalankan rebuild hanya di halaman `/insights`, atau hentikan saat tab hidden, atau debounce + jeda lebih panjang. Bangun report dari satu index event (lihat P-07) agar tiap rebuild murah.

### 🔴 P-04 — Proxy jadwal menarik seluruh FIDS sekuensial tanpa cache · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** (1) [source.ts](../src/lib/jadwal/source.ts) `fetchAllPages` kini menarik halaman 2..N **paralel** dengan batas konkurensi 6 (urutan hasil dijaga via index) — bukan ≤49 round-trip serial. (2) [route.ts](../src/app/api/jadwal/[jenis]/route.ts) menambah **cache memori 30 dtk per-jenis** (per-instance server); hit beruntun (poll 60 dtk + sync AppShell 3 mnt + multi-user) berbagi satu pull, filter `tanggal` tetap diterapkan dari cache. `tsc` lolos. Hasil model: lihat Bagian 9.6. *(Filter tanggal masih di sisi proxy — push ke upstream menunggu konfirmasi API FIDS mendukungnya.)*

**Evidensi (sebelum):** [source.ts:219](../src/lib/jadwal/source.ts#L219) — `fetchAllPages` loop `for (p=2; p<=lastPage; p++)` **sekuensial** sampai `MAX_PAGES=50`, timeout 12 dtk/halaman → bisa 50 round-trip serial per request. Route [route.ts:22](../src/app/api/jadwal/[jenis]/route.ts#L22) `force-dynamic` tanpa `revalidate`/`Cache-Control`; filter `tanggal` diterapkan **setelah** semua data ditarik ([route.ts:45](../src/app/api/jadwal/[jenis]/route.ts#L45)). Client [jadwal/client.ts:31](../src/lib/jadwal/client.ts#L31) `cache:"no-store"`, dipanggil tiap 60 dtk ([jadwal/page.tsx:81](../src/app/jadwal/page.tsx#L81)) + tiap 3 menit oleh AppShell.

**Dampak:** Latensi halaman jadwal tinggi & tidak stabil (bergantung jumlah halaman upstream). Tiap pengunjung memicu pull penuh — tidak ada cache bersama.

**Perbaikan:** Paralelkan halaman 2..N dengan `Promise.all` ber-konkurensi terbatas (mis. 5). Tambah cache singkat di route (`export const revalidate = 30`–`60`, atau cache memori TTL). Bila API upstream mendukung filter tanggal, push ke upstream alih-alih filter setelahnya.

### 🟠 P-05 — login-PIN berskala O(N) bcrypt (CPU-bound) · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** kolom baru `Operator.pinLookup` (HMAC-SHA256 PIN, helper [pin-lookup.ts](../backend/src/common/pin-lookup.ts)) ber-`@@index([pinLookup])`. [auth.service.ts](../backend/src/auth/auth.service.ts) `loginPin` kini: `findFirst({ pinLookup })` **O(1)** + **1** `bcrypt.compare` verifikasi. PIN lama (tanpa pinLookup) ditangani jalur legacy bcrypt + **backfill otomatis saat login** (migrate-on-login). Kolom di-apply via `db push`; seed di-set pinLookup. Backend `tsc` lolos. Hasil: Bagian 9.11.

**Evidensi (sebelum):** [auth.service.ts:51](../backend/src/auth/auth.service.ts#L51) — `loginPin` memuat **semua** operator aktif ber-PIN lalu `bcrypt.compare` satu per satu sampai cocok. bcrypt 10 rounds ≈ 60–100 ms per perbandingan.

**Dampak:** Login PIN melambat linier terhadap jumlah petugas: 50 petugas ≈ s/d ~4 dtk (worst-case PIN tak cocok), sambil mem-block CPU Node. Juga isu desain (PIN→operator mana pun) sudah dicatat sebagai F-07 di audit keamanan.

**Perbaikan:** Idealnya petugas memilih identitas dulu (atau kirim hint station) lalu verifikasi PIN ke **satu** kandidat → O(1) bcrypt. Bila tetap global, batasi dengan throttle (F-02) & turunkan cost-factor hanya bila risk-acceptable. Tambahkan `select` agar tak memuat kolom besar.

### 🟠 P-06 — Tambah/Reset PIN: O(50×N) bcrypt · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** [operators.service.ts](../backend/src/operators/operators.service.ts) `isPinFree` kini cek keunikan via `findFirst({ pinLookup })` **O(1)** (legacy bcrypt hanya untuk operator yang belum ter-migrasi, jumlahnya menyusut ke 0). `create`/`setPin` mengisi `pinLookup`. Jadi `generateUniquePin` tak lagi O(50×N) bcrypt. Backend `tsc` lolos. Hasil: Bagian 9.11.

**Evidensi (sebelum):** [operators.service.ts:169](../backend/src/operators/operators.service.ts#L169) `generateUniquePin` mengulang s/d 50× memanggil `isPinFree` ([:187](../backend/src/operators/operators.service.ts#L187)), dan tiap `isPinFree` memuat semua operator aktif ber-PIN lalu `bcrypt.compare` masing-masing. Worst-case = 50 × N bcrypt per pembuatan/reset PIN.

**Dampak:** Membuat/reset petugas bisa makan beberapa detik saat jumlah petugas besar; CPU-bound.

**Perbaikan:** Karena PIN harus unik, simpan **lookup PIN→operator** yang efisien (mis. HMAC PIN dengan key server, disimpan di kolom ber-index `pinLookup`) agar cek-unik & login jadi O(1) tanpa scan bcrypt. Alternatif minimal: cukup generate PIN acak dan tangani bentrok via constraint unik, bukan men-scan semua hash.

### 🟠 P-07 — `getBoardingProgress` kuadratik di render · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** ditambah `buildBoardedCounts(events)` (index `flightId → boarded count`, dibangun **sekali**, O(events)) & `boardingProgressFromCount(flight, count)` (O(1)) di [boarding.ts](../src/lib/boarding.ts). Call-site list diubah ke pola index + lookup: [dashboard/page.tsx](../src/app/dashboard/page.tsx) (`useMemo`), [flights/page.tsx](../src/app/flights/page.tsx) (`useMemo`), [insights.ts](../src/lib/insights.ts). `getBoardingProgress` lama tetap ada untuk halaman detail 1-flight. `tsc --noEmit` lolos. Hasil benchmark: lihat Bagian 9.2.

**Evidensi (sebelum):** [boarding.ts:9](../src/lib/boarding.ts#L9) men-scan **seluruh** array events tiap panggil. Dipanggil per-penerbangan di dalam `.map`: [dashboard/page.tsx:344](../src/app/dashboard/page.tsx#L344) (tanpa `useMemo` → recompute tiap render), [insights.ts:248](../src/lib/insights.ts#L248), [flights/page.tsx:349](../src/app/flights/page.tsx#L349).

**Dampak:** O(penerbangan × scan). Dengan 100 penerbangan × 5.000 scan = 500 rb iterasi tiap render dashboard.

**Perbaikan:** Bangun satu index `eventsByFlightId` (group sekali) lalu lookup → O(scan + penerbangan). Bungkus turunan dashboard dengan `useMemo`.

### 🟠 P-08 — admin/scans render 200 baris + 200 fetch foto serentak · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** di [admin/scans/page.tsx](../src/app/admin/scans/page.tsx) (1) **paginasi client-side** 25/halaman (komponen `Pagination`) → maks ~25 baris & ~25 fetch foto per halaman (dari ≤200), dan (2) `FaceThumb` kini **lazy-load** via `IntersectionObserver` (`rootMargin: 200px`) → foto baru di-fetch saat thumbnail mendekati viewport. `tsc` lolos. Hasil: lihat Bagian 9.5.

**Evidensi (sebelum):** [admin/scans/page.tsx:221](../src/app/admin/scans/page.tsx#L221) me-render `items.map(...)` dari `apiListScans({ perPage: 200 })`; tiap `ScanRow` memuat `FaceThumb` yang memanggil `getFacePhotoObjectUrl` saat mount → s/d 200 fetch gambar + object-URL serentak.

**Dampak:** Lonjakan jaringan/memori sekaligus; UI tersendat saat buka halaman.

**Perbaikan:** Paginasi (pakai [Pagination.tsx](../src/components/ui/Pagination.tsx) seperti halaman lain) + lazy-load thumbnail via `IntersectionObserver`; revoke object-URL saat unmount.

### 🟠 P-09 — `storage.ts` mem-parse ulang koleksi tiap getter · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** [storage.ts](../src/lib/storage.ts) `read<T>` kini memakai **cache in-memory `Map` per-key**; `write<T>` menyinkronkan cache, dan listener event `storage` menginvalidasi saat tab lain mengubah data. `setSession(null)`, `resetAll`, `purgeScanEventsArchive` ikut meng-invalidasi. `addFlight`/`addScanEvent` diubah agar **tidak memutasi** array hasil getter (pakai spread) supaya cache tetap konsisten. Diverifikasi: tidak ada call-site lain yang memutasi hasil getter (semua `filter/map/find/slice`). `tsc` lolos. Hasil: lihat Bagian 9.7.

**Evidensi (sebelum):** [storage.ts:23](../src/lib/storage.ts#L23) `read<T>` di-panggil oleh `getFlights()`/`getScanEvents()`/`getUsers()`/`getAuditEvents()` tanpa cache in-memory → tiap pemanggilan = `JSON.parse` penuh (sinkron, blocking main thread). Diperparah pemanggil yang sering (P-02, P-03).

**Dampak:** Untuk koleksi yang tumbuh (`scanEvents`), tiap parse makin mahal dan menumpuk karena dipanggil berkali-kali per detik.

**Perbaikan:** Cache hasil parse di memori dengan invalidasi saat `write`/event storage; atau muat sekali ke store (mis. context/zustand) dan baca dari sana. **Sudah baik:** ada `archiveOldScanEvents()` ([storage.ts:170](../src/lib/storage.ts#L170)) yang menjaga koleksi aktif tetap kecil.

### 🟠 P-10 — `next.config.js` tanpa optimasi · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** [next.config.js](../next.config.js) sudah ditambah `experimental.optimizePackageImports: ["lucide-react"]` (tree-shake ikon), `images.formats` AVIF/WebP (siap untuk P-01), dan `compiler.removeConsole` di production (kecuali `error`/`warn`). Restart `npm run dev` agar config baru kebaca.

**Evidensi (sebelum):** [next.config.js:2](../next.config.js#L2) hanya `reactStrictMode: true`. Tidak ada `experimental.optimizePackageImports` (relevan: `lucide-react` di-import belasan–puluhan ikon per halaman, mis. kiosk ~30 ikon), tidak ada konfigurasi `images`, tidak ada `compiler.removeConsole`, tidak ada bundle analyzer.

**Dampak:** Bundle awal lebih besar dari perlunya; tree-shaking ikon bergantung penuh ke bundler.

**Perbaikan:**
```js
const nextConfig = {
  reactStrictMode: true,
  experimental: { optimizePackageImports: ["lucide-react"] },
  images: { formats: ["image/avif", "image/webp"] },
  compiler: { removeConsole: process.env.NODE_ENV === "production" },
};
```

### 🟡 P-11 — Index database yang hilang · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** ditambahkan `@@index([flightNumber])` & `@@index([scannedAt])` di [schema.prisma:82-83](../backend/prisma/schema.prisma#L82), lalu di-apply ke MySQL.
> **Cara apply (PENTING — baca catatan migration di bawah):** karena DB ini dikelola via `prisma db push` (bukan migration history), perubahan di-apply dengan `cd backend && npx prisma db push`, **bukan** `migrate dev`. Hasil terverifikasi: index `ScanEvent_flightNumber_idx` & `ScanEvent_scannedAt_idx` masuk, data utuh (8 operator, 62 scan).
>
> ⚠️ **Catatan migration history (temuan baru, lihat juga P-18):** `prisma/migrations/migration_lock.toml` masih `provider = "postgresql"` dan SQL migration di [20260621033821_init](../backend/prisma/migrations/20260621033821_init/migration.sql) bersintaks PostgreSQL, padahal datasource sekarang **MySQL**. DB MySQL `afvs` tidak punya tabel `_prisma_migrations` → artinya dibuat via `db push`, bukan dari folder migration ini. Akibatnya `npx prisma migrate dev` akan **gagal (error P3019)**. Folder migration Postgres ini sebaiknya dibuang & dibuat ulang baseline MySQL bila mau pindah ke workflow migration (rencana terpisah, jangan dilakukan terburu-buru karena ada data).

**Evidensi (sebelum):** [schema.prisma:81-84](../backend/prisma/schema.prisma#L81) `ScanEvent` punya `@@index([station, scannedAt])`, `@@index([flightId])`, `@@index([resultStatus])`. **Belum ada** index untuk:
- `flightNumber` — padahal `list` memfilter `where.flightNumber` ([scan-events.service.ts:73](../backend/src/scan-events/scan-events.service.ts#L73)) → full table scan.
- Filter `scannedAt` **tanggal-saja tanpa station** tidak bisa pakai prefix `(station, scannedAt)` → scan + sort.

**Dampak:** Saat `ScanEvent` membesar (puluhan ribu), filter by-flightNumber & by-date-saja melambat (table scan).

**Perbaikan:** Tambah index, lalu `migrate`:
```prisma
model ScanEvent {
  // ...
  @@index([station, scannedAt])
  @@index([flightId])
  @@index([resultStatus])
  @@index([flightNumber])   // baru: filter list by flightNumber
  @@index([scannedAt])      // baru: filter/urut tanggal lintas-station
}
```
```bash
cd backend && npx prisma migrate dev --name add_scanevent_indexes
```
> Catatan: `ScanEvent.operatorId` & `flightId` adalah foreign key → MySQL/InnoDB **otomatis** membuat index, jadi `count by operatorId` ([operators.service.ts:139](../backend/src/operators/operators.service.ts#L139)) sudah ter-index. `Flight` & `Operator` index-nya sudah memadai.

### 🟡 P-12 — Offset pagination melambat di halaman dalam
**Evidensi:** [scan-events.service.ts:80](../backend/src/scan-events/scan-events.service.ts#L80) & [flights.service.ts:18](../backend/src/flights/flights.service.ts#L18) memakai `skip: (page-1)*perPage` + `take`. `OFFSET` di MySQL tetap memindai baris yang dilewati.

**Dampak:** Membuka halaman ke-500 dari riwayat scan besar makin lambat (memindai ~25 rb baris untuk membuang-nya).

**Perbaikan:** Untuk riwayat audit yang tumbuh, pakai **keyset/cursor pagination** (`where: { scannedAt: { lt: lastSeen } }` + `take`). Untuk data kecil sekarang, `skip/take` masih oke — prioritas rendah sampai data membesar.

### 🟡 P-13 — Komponen kamera di-import statis · ⏭️ DILEWATI (24 Jun 2026)
> **Keputusan: tidak dikerjakan.** Ditinjau: `CameraScanner` & `KtpVerifyModal` **selalu ter-mount** (dikontrol prop `open=`, bukan `{cond && …}`), jadi `next/dynamic` **tidak menunda** load-nya tanpa mengubah pola menjadi conditional-render (berisiko mengubah perilaku/animasi modal). `FaceCaptureCamera` dipakai dengan **ref** (`cameraRef`) → `dynamic` malah memutus ref. Lagipula library berat di dalamnya (zxing/tesseract) **sudah lazy** (lihat P-01 area #1), sehingga sisa manfaatnya (kode komponen sendiri) kecil. Rasio risiko/manfaat jelek → dilewati.

**Evidensi (sebelum):** `CameraScanner` ([scan/page.tsx:27](../src/app/scan/page.tsx#L27)), `FaceCaptureCamera` & `KtpVerifyModal` ([kiosk/page.tsx:37](../src/app/scan/kiosk/page.tsx#L37)) di-import statis walau hanya dipakai saat modal kamera dibuka. (Library berat di dalamnya — zxing/tesseract — **sudah** lazy, jadi dampaknya pada kode komponen sendiri.)

**Perbaikan:** Bungkus dengan `next/dynamic(() => import(...), { ssr: false })` untuk menyusutkan first-load JS halaman scan/kiosk.

### 🟡 P-14 — Service Worker cache-first tanpa expiry untuk PNG besar · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** [public/sw.js](../public/sw.js) dipisah strategi: `_next/static` (ber-hash, immutable) tetap **cache-first**; aset publik path-stabil (`/icons`, gambar termasuk **`.webp`/`.avif`**, font, manifest) jadi **stale-while-revalidate** (sajikan cache + perbarui latar belakang → tidak basi saat file diganti). Ditambah **batas 80 entri** runtime cache (FIFO `trimCache`) dan **bump `CACHE_VERSION` v1→v2** (aktivasi membersihkan cache lama). Catatan: regex sebelumnya **belum** mencakup `webp`/`avif` — kini ditambahkan agar gambar P-01 ikut ter-cache. `node --check` lolos.

**Evidensi (sebelum):** [public/sw.js:60](../public/sw.js#L60) menyimpan semua `_next/static` + css/js/png/jpg/svg/woff ke `RUNTIME_CACHE` cache-first **tanpa batas ukuran/expiry**. Karena PNG `public/` 1–2 MB (P-01) dan path-nya stabil (bukan ber-hash), gambar yang diganti bisa tersaji versi **basi**.

**Perbaikan:** Pakai **stale-while-revalidate** untuk aset `public/`; batasi ukuran/jumlah entri runtime cache. (Navigasi network-first & precache minimal **sudah baik**.)

### 🟡 P-15 — Jam AppShell re-render tiap 1 dtk di semua halaman · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** jam & tanggal dipindah ke komponen `LiveClock` tersendiri di [AppShell.tsx](../src/components/layout/AppShell.tsx) — state `now` kini lokal di komponen itu, jadi **hanya subtree jam** yang re-render tiap detik, bukan seluruh chrome AppShell (sidebar/topbar). Ditambah **visibility-gate** (berhenti saat tab tidak terlihat, sinkron ulang via `visibilitychange`). `tsc` lolos. Lihat Bagian 9.8.

**Evidensi (sebelum):** [AppShell.tsx:219](../src/components/layout/AppShell.tsx#L219) `setInterval(setNow, 1000)` me-render shell tiap detik tanpa visibility-gating; ada juga FIDS auto-sync 3 menit ([:246](../src/components/layout/AppShell.tsx#L246)) yang baca `getSettings()` tiap tick.

**Perbaikan:** Isolasi jam ke komponen kecil sendiri (agar re-render tidak menjalar ke seluruh shell) & hentikan saat tab hidden — pola visibility-gating yang sudah dipakai di [dashboard/page.tsx:45](../src/app/dashboard/page.tsx#L45).

### 🟡 P-16 — API client tanpa cache/dedup + `perPage:200` hardcap · ✅ SELESAI (24 Jun 2026)
> **Implementasi:** di [client.ts](../src/lib/api/client.ts) (1) **dedup GET in-flight** — `apiListFlights`/`apiListScans` identik yang bersamaan berbagi satu request (Map promise, dihapus saat selesai); (2) helper baru **`apiListAllFlights`/`apiListAllScans`** yang loop semua halaman (cap backend 200/hal) → tidak ada lagi data >200 yang hilang diam-diam. Pemanggil diperbarui: [flightSync.ts](../src/lib/api/flightSync.ts) (`pullFlights`) & [admin/scans](../src/app/admin/scans/page.tsx). `tsc` lolos. Lihat Bagian 9.9.

**Evidensi (sebelum):** [client.ts](../src/lib/api/client.ts) semua fetch raw tanpa cache/dedup → call identik konkuren masing-masing hit network. [flightSync.ts:72](../src/lib/api/flightSync.ts#L72) & admin/scans pakai `perPage:200` hardcap → data ke-201+ **hilang diam-diam** (korektnes + tetap menarik 200 sekaligus).

**Perbaikan:** Tambah dedup in-flight (cache promise per-URL singkat) & paginasi/loop hingga `total` alih-alih hardcap 200. **Sudah baik:** list flights/scans difilter & dipaginasi server-side, bukan fetch-all-filter-klien.

### ⚪ P-17 — Query list tanpa `select` projection
**Evidensi:** [scan-events.service.ts:83](../backend/src/scan-events/scan-events.service.ts#L83) `findMany` mengembalikan **semua** kolom termasuk `rawBarcode`/`message` walau UI list mungkin tak butuh semuanya.

**Perbaikan:** Tambahkan `select` hanya kolom yang dipakai list → kurangi payload & I/O. (Dampak kecil; lakukan saat merapikan endpoint.)

### ⚪ P-18 — Hygiene performa · ◑ SEBAGIAN SELESAI (24 Jun 2026)
> **Selesai:** (1) `scanEventsArchive` kini **dibatasi `ARCHIVE_MAX = 5000`** entri di [storage.ts](../src/lib/storage.ts) `archiveOldScanEvents` (buang yang terlama) → localStorage tak membengkak tanpa batas. (2) Komentar [schema.prisma](../backend/prisma/schema.prisma) diperbaiki (MySQL + catatan db-push/migration stale).
> **Belum:** perf budget / Lighthouse CI / monitoring (RUM) — butuh setup CI di sisi tim; direkomendasikan jalankan Lighthouse manual pada `/dashboard` & `/scan/kiosk` pasca perubahan ini.

**Detail awal:**
- ✅ `scanEventsArchive` ([storage.ts:151](../src/lib/storage.ts#L151)) dipangkas otomatis (cap 5000).
- ✅ Komentar [schema.prisma:2](../backend/prisma/schema.prisma#L2) diperbaiki (sebelumnya menyebut "SQLite").
- ⬜ Perf budget / Lighthouse CI / `npm audit` rutin.

---

## 5. Hal yang Sudah Baik 👍

- **Semua 4 library berat sudah lazy-load** via dynamic `import()`: `tesseract.js` ([ktpOcr.ts:16](../src/lib/ktpOcr.ts#L16)), `exceljs` ([xlsxExport.ts:106](../src/lib/xlsxExport.ts#L106)), `leaflet` ([radar/page.tsx:176](../src/app/radar/page.tsx#L176)), `@zxing` ([CameraScanner.tsx:184](../src/components/scan/CameraScanner.tsx#L184)). Face detection pakai **native `FaceDetector` API** — tanpa library berat.
- **Index database inti sudah ada** & masuk akal (`station+std`, `station+scannedAt`, `status`, `resultStatus`, unik `eventId`).
- **Paginasi konsisten** di 3 halaman data-besar (scan-events 25, passengers 20, flights 15) via [Pagination.tsx](../src/components/ui/Pagination.tsx), dengan derivasi `useMemo`.
- **Query backend difilter & dipaginasi server-side** (`findMany`+`count` via `Promise.all`), bukan fetch-all lalu filter di klien.
- **Tidak ada timer bocor** — semua interval/timeout/rAF punya cleanup; auto-flush ber-guard anti-dobel.
- Dashboard & flight-detail **sudah visibility-gated** (skip kerja saat tab hidden).
- Service Worker: navigasi **network-first** (tak menyajikan HTML basi) + precache minimal.
- Arsip scan otomatis menjaga koleksi aktif tetap kecil.

---

## 6. Rekomendasi Urutan Pengerjaan

1. **Cepat & dampak besar (½–1 hari):** P-01 (kompres gambar + `next/image`) → P-10 (`next.config.js`) → P-11 (tambah 2 index). Ini ROI tertinggi.
2. **Stabilitas runtime (1–2 hari):** P-02 (kiosk polling), P-03 (InsightBubble), P-07 (index events). Hilangkan jank always-on.
3. **Jaringan & skala (2–3 hari):** P-04 (proxy jadwal cache+paralel), P-05/P-06 (PIN lookup O(1)), P-08 (admin/scans paginasi+lazy), P-09 (cache parse).
4. **Hardening lanjutan:** P-12 s/d P-18 saat data mulai membesar (keyset pagination, SW SWR, projection, monitoring).

---

## 7. Checklist Optimasi (ringkas)

### 🔴 Prioritas tinggi
- [x] ✅ P-01 — Kompres semua PNG → WebP (−97%) + arahkan kode ke `.webp`. *(24 Jun 2026; `next/image` opsional menyusul)*
- [x] ✅ P-02 — Kiosk: 1× parse per siklus, interval 3→5 dtk, visibility-gate. *(24 Jun 2026)*
- [x] ✅ P-03 — InsightBubble: visibility-gate + interval 30→60 dtk. *(24 Jun 2026)*
- [x] ✅ P-04 — Proxy jadwal: cache 30 dtk + fetch halaman paralel. *(24 Jun 2026)*

### 🟠 Disarankan
- [x] ✅ P-05 / P-06 — Lookup PIN O(1) (HMAC ber-index) + migrate-on-login. *(24 Jun 2026)*
- [x] ✅ P-07 — Index boarded-count, hapus O(penerbangan×scan). *(24 Jun 2026)*
- [x] ✅ P-08 — admin/scans: paginasi 25/hal + lazy thumbnail. *(24 Jun 2026)*
- [x] ✅ P-09 — Cache hasil parse localStorage in-memory (+ invalidasi). *(24 Jun 2026)*
- [x] ✅ P-10 — `optimizePackageImports` + `images` di `next.config.js`. *(24 Jun 2026)*

### 🟡 Saat data membesar
- [x] ✅ P-11 — Index `ScanEvent.flightNumber` & `scannedAt` (via `db push`). *(24 Jun 2026)*
- [ ] P-12 — Keyset/cursor pagination untuk riwayat besar.
- [⏭️] P-13 — DILEWATI (komponen selalu mount + ref; lib berat sudah lazy). *(24 Jun 2026)*
- [x] ✅ P-14 — SW stale-while-revalidate + batas 80 entri + dukung webp/avif. *(24 Jun 2026)*
- [x] ✅ P-15 — Isolasi jam AppShell (`LiveClock`) + visibility-gate. *(24 Jun 2026)*
- [x] ✅ P-16 — Dedup GET in-flight + `apiListAll*` (hapus hardcap 200). *(24 Jun 2026)*

### ⚪ Berkelanjutan
- [ ] P-17 — `select` projection pada query list.
- [◑] P-18 — ✅ cap arsip + ✅ komentar skema; ⬜ Lighthouse CI/perf budget. *(24 Jun 2026)*

---

## 8. Log Implementasi

Riwayat perbaikan yang sudah dikerjakan (dari audit ini). Dikerjakan bertahap.

| Tgl | Item | Yang dilakukan | Verifikasi |
|---|---|---|---|
| 24 Jun 2026 | **P-10** | [next.config.js](../next.config.js): `optimizePackageImports` (lucide-react), `images.formats` AVIF/WebP, `compiler.removeConsole` (prod). | `node -e require('./next.config.js')` → config valid. Perlu restart `npm run dev`. |
| 24 Jun 2026 | **P-11** | [schema.prisma](../backend/prisma/schema.prisma): tambah `@@index([flightNumber])` & `@@index([scannedAt])` di `ScanEvent`; apply via `npx prisma db push`. | `INFORMATION_SCHEMA.STATISTICS`: `ScanEvent_flightNumber_idx` & `ScanEvent_scannedAt_idx` ada. Data utuh (8 operator, 62 scan). |
| 24 Jun 2026 | **P-01** | Kompres semua PNG → WebP via `sharp` (logo 160px, bg 1280px); ganti 9 referensi `.png`→`.webp` di 4 file. PNG asli disimpan. | **19.169 KB → 606 KB (−97%)**. Semua `.webp` ada, tak ada sisa `.png`. |
| 24 Jun 2026 | **P-07** | `boarding.ts`: `buildBoardedCounts` (index sekali) + `boardingProgressFromCount` (O(1)); call-site dashboard/flights/insights pakai index. | `tsc` lolos. Benchmark: **−62%…−78%** waktu komputasi (Bagian 9.2). |
| 24 Jun 2026 | **P-02** | Kiosk `refresh()`: `getFlights()` 1× (dari 2×), visibility-gate, interval 3→5 dtk. | `tsc` lolos. Benchmark: **−9%…−50%** per siklus + 40% lebih jarang (Bagian 9.3). |
| 24 Jun 2026 | **P-03** | InsightBubble: visibility-gate (skip saat tab hidden) + interval 30→60 dtk. | `tsc` lolos. Rebuild saat hidden **20×→0×** per 10 mnt; saat visible **20×→10×** (Bagian 9.4). |
| 24 Jun 2026 | **P-08** | admin/scans: paginasi 25/hal + `FaceThumb` lazy-load (IntersectionObserver). | `tsc` lolos. Fetch foto serentak **≤200 → ≤25 (hanya yg terlihat)** (Bagian 9.5). |
| 24 Jun 2026 | **P-04** | Proxy jadwal: fetch halaman paralel (konkurensi 6) + cache memori 30 dtk. | `tsc` lolos. Model latency **−60%…−80%**; cache-hit ~5 ms (Bagian 9.6). |
| 24 Jun 2026 | **P-09** | `storage.ts`: cache parse per-key (sinkron `write`, invalidasi event `storage`); hapus mutasi in-place. | `tsc` lolos. Render baca-berulang **−80% (5×)** (Bagian 9.7). |
| 24 Jun 2026 | **P-15** | Jam AppShell → komponen `LiveClock` (re-render terisolasi) + visibility-gate. | `tsc` lolos. Re-render/dtk: **seluruh shell → subtree jam saja**; **0** saat tab hidden (Bagian 9.8). |
| 24 Jun 2026 | **P-16** | Dedup GET in-flight + `apiListAllFlights/Scans` (loop semua halaman). | `tsc` lolos. Request identik **N→1**; data >200 **tidak lagi hilang** (Bagian 9.9). |
| 24 Jun 2026 | **P-14** | SW: `_next` cache-first, aset publik stale-while-revalidate, batas 80 entri, +webp/avif, v1→v2. | `node --check` lolos. Aset tak lagi basi + cache ter-batasi (Bagian 9.10). |
| 24 Jun 2026 | **P-05/06** | Kolom `pinLookup` (HMAC) ber-index; login-PIN & cek-unik O(1) + migrate-on-login. | `db push` + backend `tsc` lolos. login-PIN **−98%** (50 petugas: 3.141→64 ms) (Bagian 9.11). |
| 24 Jun 2026 | **P-18** | Cap `scanEventsArchive` 5.000 entri; perbaiki komentar skema (MySQL). | `tsc` lolos. Arsip localStorage tak lagi tumbuh tanpa batas. |
| 24 Jun 2026 | **P-13** | ⏭️ Ditinjau & dilewati — `dynamic` tak bermanfaat (komponen selalu mount + ref; lib sudah lazy). | — |

**Temuan sampingan (24 Jun 2026):** DB dikelola via `prisma db push`, **bukan** migration history. Folder `prisma/migrations/` masih Postgres → `prisma migrate dev` error P3019. Selama pakai `db push`, abaikan folder itu; lihat catatan di P-11 & P-18 bila mau rapikan.

**Sisa (opsional, dampak kecil / hanya saat skala besar):** P-17 (`select` projection — manfaat kecil, hati-hati tipe), P-12 (keyset pagination — hanya saat data >puluhan ribu), Lighthouse CI (P-18). Tertunda atas permintaan: P-01 lanjutan (`<img>` → `next/image`). **Semua bottleneck prioritas tinggi/menengah sudah ditutup.**

---

## 9. Perbandingan Performa (Before → After)

Hasil pengukuran nyata dari perbaikan yang sudah diterapkan. **Catatan metodologi:** 9.1 = estimasi waktu transfer (ukuran byte ÷ kecepatan jaringan; load nyata diparalelkan jadi sedikit lebih cepat). 9.2 & 9.3 = benchmark `performance.now()` rata-rata ratusan iterasi pada Node (replika logika asli), mengukur **waktu komputasi main-thread** — penentu jank/responsivitas. Data DB saat ini kecil (62 scan) sehingga angka absolut kecil; tabel menunjukkan juga skala besar untuk membuktikan tren.

### 9.1 Transfer gambar saat buka halaman (P-01) — dampak terbesar

| Skenario (ukuran) | Jaringan | Sebelum | Sesudah |
| --- | --- | --- | --- |
| Dashboard — background hero (1.461 KB → 28 KB) | 4G umum (500 KB/s) | **2.922 ms** | **56 ms** |
| | 3G lambat (200 KB/s) | 7.305 ms | 140 ms |
| Halaman list — 6 logo maskapai (4.966 KB → 20 KB) | 4G umum | **9.932 ms** | **39 ms** |
| | 3G lambat | 24.830 ms | 98 ms |
| Cold load semua aset (19.169 KB → 606 KB) | WiFi cepat (1.5 MB/s) | 12.779 ms | 404 ms |
| | 4G umum | 38.338 ms | 1.212 ms |
| | 3G lambat | 95.845 ms | 3.030 ms |

> Inilah jawaban "akses web berapa ms jadi berapa ms": pada 4G umum, transfer gambar dashboard turun dari **~2,9 detik → ~56 ms**, dan list maskapai **~9,9 detik → ~39 ms**.

### 9.2 Komputasi boarding progress per render halaman (P-07)

| Data | Sebelum | Sesudah | Perbaikan |
| --- | --- | --- | --- |
| 30 flight × 100 scan (≈ skala sekarang) | 0,05 ms | 0,02 ms | −69% (3,2×) |
| 60 flight × 1.000 scan | 0,38 ms | 0,14 ms | −62% (2,7×) |
| 100 flight × 5.000 scan | 3,13 ms | 0,69 ms | −78% (4,6×) |
| 150 flight × 12.000 scan | 9,24 ms | 3,02 ms | −67% (3,1×) |

> Dihitung **tiap render** (dashboard re-render tiap 30 dtk + tiap interaksi). Sebelumnya tidak dimemo → makin besar data makin terasa lag; kini O(1) per flight.

### 9.3 Satu siklus refresh kiosk — parse localStorage (P-02)

| Data | Sebelum | Sesudah | Perbaikan |
| --- | --- | --- | --- |
| 50 flight × 100 scan (≈ skala sekarang) | 0,19 ms | 0,15 ms | −23% (1,3×) |
| 200 flight × 1.000 scan | 1,22 ms | 1,10 ms | −9% (1,1×) |
| 300 flight × 5.000 scan | 5,60 ms | 2,82 ms | −50% (2,0×) |

> Selain per-siklus lebih murah, visibility-gate membuat siklus **0 ms saat tab tidak terlihat**, dan interval 3→5 dtk mengurangi jumlah siklus ~40%.

### 9.4 InsightBubble — rebuild laporan always-on (P-03)

Biaya **I/O per rebuild** (4 parse localStorage; komputasi `buildAppInsightReport` ada di atasnya):

| Data | Per rebuild (I/O) |
| --- | --- |
| Skala sekarang (50 flight / 100 scan / 100 audit) | 0,11 ms |
| Skala besar (200 flight / 5.000 scan / 3.000 audit) | 3,47 ms |

Karena komponen hidup di **semua halaman** (AppShell), yang paling berdampak adalah **reduksi frekuensi rebuild** (per 10 menit):

| Kondisi | Sebelum | Sesudah |
| --- | --- | --- |
| Tab **disembunyikan** | 20× rebuild | **0×** (visibility-gate) |
| Tab **terlihat** | 20× rebuild | **10×** (interval 30→60 dtk) |

> Contoh: laptop petugas dengan tab AFVS di-background 10 menit kini **tidak** menjalankan satu pun rebuild laporan (sebelumnya 20×, tiap-nya 4 parse + komputasi).

### 9.5 admin/scans — render & fetch foto saat buka halaman (P-08)

| Metrik (sekali buka halaman, 200 hasil) | Sebelum | Sesudah |
| --- | --- | --- |
| Baris DOM dirender | 200 | **25** (per halaman) |
| Fetch foto wajah serentak | s/d 200 | **≤25, hanya yang terlihat** (IntersectionObserver) |
| Estimasi transfer thumbnail (≈30 KB/foto, 4G 500 KB/s) | ~6.000 KB → **~12 dtk** kontensi | ~300–750 KB → **~0,6–1,5 dtk** |

> Sebelumnya membuka halaman memicu ratusan permintaan gambar sekaligus (saturasi koneksi + lonjakan memori object-URL). Kini hanya thumbnail di layar yang di-fetch.

### 9.6 Proxy jadwal — latency buka halaman jadwal (P-04)

Model latency (asumsi ~150 ms/halaman round-trip FIDS, konkurensi 6):

| Jumlah halaman FIDS | Sebelum (sekuensial) | Sesudah (paralel) | Cache-hit (req ke-2 < 30 dtk) |
| --- | --- | --- | --- |
| 10 | 1.500 ms | **450 ms** (−70%) | **~5 ms** |
| 30 | 4.500 ms | **900 ms** (−80%) | ~5 ms |
| 50 | 7.500 ms | **1.500 ms** (−80%) | ~5 ms |

> Pull pertama jauh lebih cepat (paralel); request berikutnya dalam 30 dtk (poll halaman + sync AppShell + user lain) hampir gratis dari cache. Inilah hotspot latency terbesar yang dipangkas.

### 9.7 Cache parse localStorage (P-09)

Waktu satu render yang membaca `flights` + `scans` **5×** (pola umum: beberapa `useMemo`/komponen membaca koleksi yang sama):

| Data | Sebelum (parse tiap baca) | Sesudah (parse 1× + cache) | Perbaikan |
| --- | --- | --- | --- |
| 50 flight × 100 scan (≈ skala sekarang) | 0,58 ms | 0,12 ms | −80% (5,0×) |
| 200 flight × 1.000 scan | 5,01 ms | 0,96 ms | −81% (5,2×) |
| 300 flight × 5.000 scan | 25,10 ms | 5,03 ms | −80% (5,0×) |

> Fondasi yang mempercepat **banyak halaman sekaligus** (dashboard, flights, kiosk, InsightBubble) karena semuanya membaca koleksi yang sama berkali-kali. Makin sering dibaca per render, makin besar hematnya.

### 9.8 Jam AppShell — cakupan re-render (P-15)

Bukan soal ms per-operasi, tapi **cakupan & frekuensi re-render** (jam berdetak di semua halaman):

| Aspek (per detik) | Sebelum | Sesudah |
| --- | --- | --- |
| Yang re-render | **Seluruh chrome AppShell** (sidebar + topbar) | **Hanya subtree `LiveClock`** |
| Saat tab disembunyikan | tetap tiap 1 dtk | **0** (berhenti) |
| Frekuensi (10 mnt, tab hidden) | 600× | **0×** |

> React tetap mem-bypass `{children}` (elemen sama), tapi sebelumnya seluruh markup chrome tetap dievaluasi ulang tiap detik di setiap halaman. Kini terisolasi ke kotak jam kecil.

### 9.9 API client — dedup & kelengkapan data (P-16)

| Aspek | Sebelum | Sesudah |
| --- | --- | --- |
| GET identik bersamaan (poll 60 dtk + refresh manual + multi-komponen) | N request | **1 request** (dedup in-flight) |
| Data > 200 baris | **hilang diam-diam** (hardcap `perPage:200`) | **lengkap** (loop semua halaman) |

> Dua manfaat: hemat request jaringan (dedup) **dan** perbaikan korektnes — sebelumnya jika satu pos punya >200 scan/flight, sisanya tak pernah tampil/tersinkron.

### 9.10 Service Worker — strategi cache (P-14)

| Aspek | Sebelum | Sesudah |
| --- | --- | --- |
| `_next/static` (ber-hash) | cache-first | cache-first (tetap, aman) |
| Aset publik (`/icons`, gambar, font) | cache-first → **bisa basi** | **stale-while-revalidate** (cepat + auto-perbarui) |
| Format `.webp`/`.avif` | **tidak ter-cache** (regex lupa) | ter-cache |
| Batas ukuran runtime cache | tak ada → bisa bengkak | **80 entri** (FIFO) |
| Versi cache | v1 | v2 (aktivasi bersihkan v1) |

> Bukan soal ms, tapi **kesegaran + disiplin disk**: setelah ganti gambar/CSS, klien tak lagi tersangkut versi basi, dan cache tidak membengkak tanpa batas.

### 9.11 login-PIN & kelola PIN — O(N) bcrypt → O(1) lookup (P-05/P-06)

Diukur: `bcryptjs.compare` (10 rounds) = **62,8 ms/op** di mesin ini.

**login-PIN (worst-case, PIN tak cocok / cocok di urutan akhir):**

| Jumlah petugas ber-PIN | Sebelum (N× bcrypt) | Sesudah (1 lookup + 1 bcrypt) |
| --- | --- | --- |
| 5 | 314 ms | **64 ms** (−80%) |
| 20 | 1.257 ms | **64 ms** (−95%) |
| 50 | 3.141 ms | **64 ms** (−98%) |
| 100 | 6.283 ms | **64 ms** (−99%) |

**Tambah/Reset PIN (cek keunikan):**

| Jumlah petugas | Sebelum (≈N× bcrypt, tipikal) | Sesudah (lookup index) |
| --- | --- | --- |
| 50 (tipikal, 1 percobaan) | 3.141 ms | **~1 ms** |
| 50 (worst-case 50 percobaan unik) | **~157 dtk** | **~50 ms** |

> Sebelumnya login-PIN & pembuatan petugas melambat **linear** terhadap jumlah petugas (CPU-bound bcrypt, mem-block event-loop Node). Kini konstan. PIN lama otomatis ter-migrasi saat login pertama. (Catatan: ini juga menutup sebagian permukaan isu keamanan **F-07** di audit keamanan — PIN tak lagi di-scan global.)

---
*Dokumen ini modul audit internal (performa). Setelah prioritas tinggi (Bagian 7) selesai, ukur ulang dengan Lighthouse pada `/dashboard` & `/scan/kiosk`, dan `EXPLAIN` query list saat data >10 rb baris untuk verifikasi index terpakai.*
