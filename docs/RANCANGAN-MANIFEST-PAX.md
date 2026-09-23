# Rancangan: Manifest Penumpang per Penerbangan (persisted, lokal + backend)

Status: **TERIMPLEMENTASI** (2026-07-03). Rancangan dibuat 2026-07-02.
Verifikasi E2E API lolos: upsert saat push VALID, idempoten by eventId, dedup
tiket→PNR (scanCount naik tanpa menambah baris), backfill idempotent. Unit test
backend 12/12 hijau; typecheck frontend bersih.

## 1. Latar belakang & tujuan

Pertanyaan pemicu: "jadwal penerbangan belum menyimpan data pax?" — benar, `Flight`
hanya menyimpan `expectedPax` (angka), bukan daftar penumpang.

Maksud yang diinginkan: **setiap boarding pass yang di-scan → data pax-nya masuk &
terkumpul ke penerbangan (maskapai) yang bersangkutan**, sehingga aplikasi punya
**hitungan sendiri + detail boarding pass per penerbangan**, tersimpan **lokal DAN
backend**.

## 2. Apa yang SUDAH ada (jujur)

Daftar pax per-flight **sudah** ditampilkan di halaman detail flight
(`src/app/flights/[id]/page.tsx`), dibangun on-the-fly dari scan events lokal:

- Boarding progress (boarded / expectedPax, %, sisa) — `src/lib/boarding.ts`
- Tabel penumpang (seat, nama, PNR, tiket, first/last scan, jumlah scan)
- Seat map, modal detail penumpang, export Excel & print manifest

Backend menyimpan tiap `ScanEvent` mentah (tabel `ScanEvent`) + sudah me-resolve
`flightId` saat push (`backend/src/scan-events/scan-events.service.ts`).

### Yang BELUM ada (gap yang akan dikerjakan)

1. **Manifest per-flight yang persisted** (bukan sekadar dihitung ulang tiap render).
2. **Agregat manifest di backend** — tak ada tabel/endpoint "penumpang milik flight X".
   Akibatnya hitungan bersifat per-device (hanya dari scan lokal device itu).
3. **Sumber angka yang otoritatif lintas-device** (server sebagai sumber kebenaran).
4. **Rollup per maskapai** (total pax boarding per airline).

## 3. Model data

### 3.1 Backend (Prisma) — model baru `FlightPassenger`

```prisma
model FlightPassenger {
  id             String   @id @default(cuid())
  flightId       String
  flight         Flight   @relation(fields: [flightId], references: [id], onDelete: Cascade)

  dedupKey       String   // kunci unik pax dalam 1 flight (lihat §4)
  pnr            String?
  ticketNumber   String?
  seat           String?
  passengerName  String?

  firstScannedAt DateTime
  lastScannedAt  DateTime
  scanCount      Int      @default(1)
  boarded        Boolean  @default(true)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([flightId, dedupKey])
  @@index([flightId])
}
```

Tambah relasi balik di `Flight`: `passengers FlightPassenger[]`.
Migrasi via `prisma db push` (BUKAN `migrate` — sesuai catatan project).

### 3.2 Frontend — store lokal kanonik

- Key baru `afvs.manifests` di `src/lib/storage.ts`: `Record<flightId, PassengerRecord[]>`.
- Tipe `PassengerRecord` sudah ada di `src/lib/types.ts` (dipakai ulang), tambah
  `boarded: boolean` opsional bila perlu.
- Getter/setter: `getManifest(flightId)`, `upsertManifestPax(flightId, pax)`,
  `getAllManifests()`.

## 4. Kunci dedup (matching)

**KEPUTUSAN (terkunci): `dedupKey = normalize(ticketNumber) || normalize(pnr)`** —
tiket lebih unik per orang; fallback PNR bila tiket kosong. 1 penumpang = 1 baris
walau kursi berubah saat check-in. `normalize` = trim + uppercase + hapus spasi/strip.

> Konsekuensi: angka bisa beda tipis dengan tampilan lama (yang memakai composite
> `pnr-seat-tiket`). Halaman detail lama akan diselaraskan agar memakai kunci ini juga.

## 5. Alur tulis (scan → manifest)

### 5.1 Lokal (offline-first)
Di `src/lib/scanService.ts` `processScan()`, saat `outcome.status === "VALID_FLIGHT"`:
upsert ke `afvs.manifests[flight.id]` (increment `scanCount`, update `lastScannedAt`,
set `firstScannedAt` bila baru). Ditulis **saat scan**, bukan hanya dihitung ulang.

### 5.2 Backend
Tidak perlu outbox baru — scan sudah otomatis di-push ke `/scan-events`.
Di `ScanEventsService.push()`, setelah `scanEvent.create()`, bila
`resultStatus === "VALID_FLIGHT"` && `flightId` ada → `prisma.flightPassenger.upsert`
by `(flightId, dedupKey)` (create atau increment `scanCount` + update `lastScannedAt`).
Idempotensi tetap terjaga (push existing eventId di-skip lebih awal → tak double-count).

## 6. Alur baca

### Endpoint backend baru (`flights` module)
- `GET /flights/:id/passengers` → daftar `FlightPassenger` + `count`, urut seat.
- `GET /flights/:id/manifest-summary` → `{ boarded, expected, remaining, percent }`.
- (opsional) `GET /manifests/by-airline?date=YYYY-MM-DD` → rollup pax per maskapai.
- Scoping F-05 diterapkan (operator hanya station-nya; admin/supervisor lintas-station).

### Frontend
- `src/lib/api/client.ts`: tambah `apiFlightPassengers(flightId)`.
- Halaman detail flight: bila `apiSyncEnabled` → tampilkan manifest **server** dengan
  indikator sumber ("Server" / "Lokal"); offline → fallback ke store lokal / derived.
- Angka boarding progress diambil dari sumber yang sama agar konsisten.

## 7. UI / halaman

1. **Detail flight** — tambah badge sumber data + tombol "Sinkron ulang". Konten
   pax list/seat map/export tetap (tinggal ganti sumber datanya).
2. **Rollup per maskapai** (opsional, sesuai "masuk ke tiap maskapai") — kartu di
   dashboard/analytics: total pax boarding per airline hari ini.

## 8. Backfill

Karena backend sudah punya ScanEvent historis: skrip/endpoint sekali-jalan
`POST /admin/manifests/rebuild?date=` untuk membangun `FlightPassenger` dari
ScanEvent yang ada (agregasi group-by flightId + dedupKey).

## 9. Dampak & risiko

- Ubah cara hitung dedup (bila pindah ke tiket→PNR) → angka bisa beda tipis dgn
  tampilan lama. Perlu konfirmasi.
- Tambah tabel + endpoint → perlu `prisma db push` (backend harus di-stop dulu saat
  generate, karena Windows mengunci engine .dll).
- Tidak mengubah logika validasi scan (tetap terima/tolak seperti sekarang) — manifest
  murni pencatatan/rekap.

## 10. Rencana kerja (urutan)

1. Prisma: model `FlightPassenger` + relasi, `prisma db push`, `prisma generate`.
2. Backend: upsert manifest di `ScanEventsService.push()`.
3. Backend: endpoint read `GET /flights/:id/passengers` + summary (+ rollup opsional).
4. Backend: endpoint backfill/rebuild dari ScanEvent historis.
5. Frontend: store lokal `afvs.manifests` + tulis di `processScan()`.
6. Frontend: `client.ts` fetch manifest server + wiring di detail flight (indikator sumber).
7. (opsional) Rollup pax per maskapai di dashboard/analytics.
8. Update docs: `MODUL_APLIKASI.md`, struktur direktori, `BACKEND_SETUP` (sesuai kebiasaan project).

## 11. Keputusan (TERKUNCI 2026-07-02)

- [x] Kunci dedup: **tiket → PNR** (`normalize(ticket) || normalize(pnr)`).
- [x] Cakupan catat: **hanya scan VALID_FLIGHT** (yang benar-benar boarding).
- [x] Rollup per maskapai: **ditunda** (bukan bagian tahap ini; §7.2 & §10.7 opsional).
