# Implementation Plan — Multi-Checkpoint Scanning

> Status: **Draft / awaiting approval** · Belum di-implement.
> Tujuan: mendukung 2–3 pos scan (Pintu Terminal, Pre X-ray, Gate Boarding) di aplikasi AFVS.

## 1. Konsep alur

Bandara di Indonesia umumnya punya 2–3 titik pemeriksaan boarding pass:

```
[Pos 1: Pintu Terminal]
        │  cek BP + KTP visual
        ▼
   Check-in counter
        │
        ▼
[Pos 2: Pre X-ray / SCP]
        │  cek BP + KTP, bagasi masuk X-ray
        ▼
       X-ray
        │
        ▼
[Pos 3: Gate Boarding]
        │  scan BP saat masuk pesawat
        ▼
      Pesawat
```

Sistem track progres per penumpang lintas pos. Satu boarding pass di-scan beberapa kali, masing-masing di pos berbeda.

## 2. Data model

### 2.1 Tambah field di `ScanEvent`

```ts
// src/lib/types.ts
export type CheckpointType =
  | "TERMINAL_ENTRY"   // Pos 1: pintu masuk terminal
  | "SECURITY_XRAY"    // Pos 2: pre X-ray / SCP
  | "BOARDING_GATE";   // Pos 3: gate (default; backward-compat)

export interface ScanEvent {
  // ...field existing
  checkpoint: CheckpointType;
}
```

### 2.2 Setting per device

```ts
// src/lib/settings.ts
export interface AppSettings {
  // ...
  activeCheckpoint: CheckpointType;  // default "BOARDING_GATE"
}
```

Disimpan di `localStorage`. Tiap device/laptop di pos masing-masing memilih satu kali.

### 2.3 Status hasil baru

```ts
export type ScanResultStatus =
  | "VALID_FLIGHT"
  | "DUPLICATE_SCAN"
  | "FLIGHT_NOT_TODAY"
  | "FLIGHT_NOT_ACTIVE"
  | "UNKNOWN_FLIGHT"
  | "INVALID_BARCODE"
  | "OUT_OF_ORDER"                // baru: scan di pos lebih akhir tanpa lewat pos sebelumnya
  | "ALREADY_AT_LATER_CHECKPOINT"; // baru: info — sudah scan di pos selanjutnya
```

## 3. Perubahan logika validasi (`src/lib/scanService.ts`)

### 3.1 Aturan per checkpoint

| Pos | Time window | Duplicate (same pos) | Out-of-order |
|---|---|---|---|
| Terminal | Boleh sangat awal (sampai 3 jam sebelum STD) | → `DUPLICATE_SCAN` | — |
| X-ray | Tidak strict; idealnya setelah Terminal | → `DUPLICATE_SCAN` | → `OUT_OF_ORDER` (warning, **tetap loloskan**) |
| Gate | Strict — hanya saat efektif `OPEN`/`ACTIVE` | → `DUPLICATE_SCAN` | → `OUT_OF_ORDER` (warning, **tetap loloskan**) |

Dedup key berubah:
```ts
// LAMA:  `${pnr}-${seat}-${ticket}`
// BARU:  `${pnr}-${seat}-${ticket}-${checkpoint}`
```

Satu penumpang dapat punya 1 event per checkpoint tanpa dianggap duplicate.

### 3.2 Pseudocode validasi

```ts
function processScan(raw, scannerEmail, checkpoint) {
  const parsed = parseBarcode(raw);
  if (!parsed) return INVALID_BARCODE;

  const flight = findFlightByNumber(parsed.flightNumber);
  if (!flight) return UNKNOWN_FLIGHT;
  if (flight.departureDate !== today()) return FLIGHT_NOT_TODAY;

  // Time window per pos
  if (checkpoint === "BOARDING_GATE" && !isFlightActive(flight)) {
    return FLIGHT_NOT_ACTIVE;
  }
  // Terminal & X-ray: tidak strict pada status

  // Duplicate di pos yang sama
  const dupSamePos = scanEvents.some(e =>
    e.parsedPnr === parsed.pnr &&
    e.parsedSeatNumber === parsed.seatNumber &&
    e.checkpoint === checkpoint
  );
  if (dupSamePos) return DUPLICATE_SCAN;

  // Out-of-order check (loose: warning, tidak block)
  const order = ["TERMINAL_ENTRY", "SECURITY_XRAY", "BOARDING_GATE"];
  const currentIdx = order.indexOf(checkpoint);
  const previousPosses = order.slice(0, currentIdx);
  const hasPrevious = previousPosses.length === 0 || previousPosses.some(prev =>
    scanEvents.some(e =>
      e.parsedPnr === parsed.pnr &&
      e.checkpoint === prev &&
      e.resultStatus === "VALID_FLIGHT"
    )
  );
  if (!hasPrevious) return OUT_OF_ORDER; // warning, masih dianggap valid

  return VALID_FLIGHT;
}
```

## 4. UI changes

### 4.1 Scan page (`src/app/scan/page.tsx`)

- **Header tambah segmented control** "Pos Aktif": `[Terminal] [X-ray] [Gate]`
- **Warna hero berubah per pos:**
  - Terminal = biru
  - X-ray = oranye
  - Gate = emerald (existing)
- **Modal hasil tambah timeline progres:**
  ```
  ✓ Terminal  14:30
  ✓ X-ray     14:45
  ⏳ Gate      —
  ```
- Selector pos persistent → simpan ke setting.

### 4.2 Flight detail (`src/app/flights/[id]/page.tsx`)

- **Tabel penumpang** tambah kolom "Progress" — 3 ikon titik:
  - `●─●─○` (sampai X-ray)
  - `●─●─●` (sampai Gate)
- **SeatMap** — tier warna per pos terakhir:
  - Kuning = baru Terminal
  - Orange = sampai X-ray
  - Emerald = sampai Gate (existing)
- **PassengerDetailModal** tambah section "Timeline Pos" dengan timestamp tiap pos.

### 4.3 Dashboard / Analytics

- **Funnel widget**: berapa penumpang di tiap tahap per flight.
- **Anomaly card**: orang yang scan di X-ray tanpa Terminal (mungkin masuk dari pintu lain).

### 4.4 Settings (`src/app/settings/page.tsx`)

Tab baru **"Pos Aktif"**:
- Pilih default checkpoint device ini
- Info teks tiap pos
- Tampilkan badge "ACTIVE: Terminal" di topbar app supaya petugas selalu sadar di pos mana

## 5. Edge cases

- **Transit / connecting passenger** masuk dari airside, skip Pos 1 → harus boleh di Pos 2/3 tanpa block. Solusi: loose mode (`OUT_OF_ORDER` cuma warning).
- **Pos 1 buka jauh lebih awal** dari status `OPEN` flight → di Pos 1 jangan cek `FLIGHT_NOT_ACTIVE`.
- **Multiple device per pos** → tidak masalah karena dedup per `(pnr+seat+ticket, checkpoint)`.
- **Migrasi data lama**: semua event tanpa `checkpoint` di-treat sebagai `BOARDING_GATE` saat read.
- **Petugas salah pilih pos** → tombol "Ganti Pos" sticky di header scan page; ganti pos tidak butuh logout.
- **Penumpang tunjuk QR di HP tapi gagal di-scan kamera, jadi diketik manual** → tetap dihitung sebagai scan di pos aktif.

## 6. Phasing

### Phase 1 — Foundation (1 sesi development)
- Tambah field `checkpoint` ke `ScanEvent`
- Tambah `activeCheckpoint` ke setting + selector di scan page
- Update logic dedup per checkpoint
- Backward-compat read: default `BOARDING_GATE`
- **Acceptance:** petugas pos terminal bisa scan, hasil masuk dengan `checkpoint = TERMINAL_ENTRY`, scan ulang di pos sama = `DUPLICATE`, scan di pos berbeda = `VALID`

### Phase 2 — Visual progress (1 sesi)
- Result modal tampilkan timeline 3 pos
- Tabel penumpang kolom progress
- SeatMap tier warna per pos
- PassengerDetailModal timeline section

### Phase 3 — Analytics & rules (opsional, 1 sesi)
- Funnel widget dashboard
- Status `OUT_OF_ORDER` warning
- Time-window rules per pos (mis. Pos 1 boleh H-3 jam)
- Anomaly detection

## 7. Pertanyaan & trade-off

1. **Pos 1 (pintu terminal) di airport asli pakai scan barcode juga?** Beberapa bandara cuma cek mata + KTP, tidak scan. Kalau begitu Pos 1 boleh skip → fokus Pos 2 + Gate (jadi 2 pos saja).
2. **Aturan urutan:** strict (tolak X-ray kalau belum Terminal) atau loose (cuma warning)? Rekomendasi: **loose** karena banyak edge case.
3. **Device tetap di satu pos**, atau **petugas pindah-pindah pos**? Kalau pindah, UI re-select cepat (sudah di-plan via tombol sticky).
4. **Apakah pemeriksaan KTP harus ditambahkan?** (Lihat diskusi sebelumnya — tombol "Cocok dengan KTP" di modal hasil). Kalau iya, bisa dijadikan **Phase 2.5** terpisah.

## 8. Files yang akan disentuh

- `src/lib/types.ts` — `ScanEvent`, `ScanResultStatus`, `CheckpointType`
- `src/lib/settings.ts` — `activeCheckpoint`
- `src/lib/scanService.ts` — logic dedup + out-of-order + time window
- `src/lib/storage.ts` — migrasi baca event lama
- `src/app/scan/page.tsx` — selector pos + modal timeline
- `src/app/flights/[id]/page.tsx` — kolom progress
- `src/components/flights/SeatMap.tsx` — tier warna
- `src/components/flights/PassengerDetailModal.tsx` — timeline pos
- `src/app/settings/page.tsx` — tab pos aktif
- (opsional) `src/app/dashboard/page.tsx` — funnel widget
- (opsional) `src/app/analytics/page.tsx` — anomaly

---

_Author: tim AFVS · Review: pending_
