# AFVS — Implementation Roadmap

Audit fitur & UI yang masih kurang dari aplikasi **Airport Flight Validation System**, dikelompokkan berdasarkan prioritas operasional.

> **Konteks**: logic inti (parsing barcode IATA BCBP/MVP, validasi `VALID_FLIGHT` / `DUPLICATE_SCAN` / `FLIGHT_NOT_TODAY` / `FLIGHT_NOT_ACTIVE` / `UNKNOWN_FLIGHT` / `INVALID_BARCODE`, dedup PNR+Seat+Tiket, role-based access) sudah solid. Gap utama ada di **workflow operasional**, **UX di lapangan**, dan **polish**.

---

## Legenda

| Tag | Arti |
|---|---|
| ✅ | Sudah dikerjakan |
| 🟢 P0 | Wajib untuk go-live di operasi nyata |
| 🟡 P1 | Penting — bikin workflow lebih halus |
| 🔵 P2 | Polish UX & developer ergonomics |
| ⚪ P3 | Nice-to-have, riset, eksplorasi |
| ⏱ S/M/L | Effort: <½ hari / 1–2 hari / >2 hari |

---

## 🟢 P0 — Operasional Critical

### ✅ #1 — Boarding workflow + capacity
**Status**: Selesai.
Field `expectedPax` di Flight, `BoardingProgress` (boarded / expected / remaining / percent / tone), `BoardingCard` di detail flight + tombol **Tutup Boarding** (status → CLOSED, otomatis blokir scan via `ACTIVE_STATUSES`). Progres juga muncul di list flight (kolom Boarding) dan dashboard "Hari Ini".

### #2 — Manifest export (CSV)  ⏱ S
**Kenapa**: petugas darat butuh hard-copy manifest setelah boarding ditutup. Format CSV minimum (PNR, Nama, Seat, Tiket, Waktu Scan Pertama/Terakhir, Jumlah Scan).
**Bangun**:
- Tombol "Export Manifest (CSV)" di [src/app/flights/[id]/page.tsx](src/app/flights/[id]/page.tsx) (sebelah Edit/Hapus, aktif untuk semua role).
- Helper `src/lib/export.ts` → `toCsv(rows)` + `download(blob, filename)`.
- Filename: `manifest_<flightNumber>_<departureDate>.csv`.

### #3 — Reopen boarding (undo CLOSED)  ⏱ S
**Kenapa**: kadang petugas salah tekan "Tutup Boarding" sementara masih ada late passenger.
**Bangun**:
- Di flight detail, kalau status `CLOSED` dan role admin/supervisor → tombol **Buka Kembali** (status → OPEN).
- Konfirmasi: "Boarding sudah ditutup — yakin membuka kembali?"
- Catat di audit trail (lihat #4).

### #4 — Audit log untuk perubahan status flight  ⏱ M
**Kenapa**: pertanggungjawaban operasional. Siapa menutup boarding, kapan, dari status apa.
**Bangun**:
- Type baru `FlightAuditEvent { id, flightId, action, fromStatus, toStatus, userId, userName, at, note? }`.
- localStorage key `afvs.flightAuditEvents`.
- Hook ke `updateFlight` jika `status` berubah → push event.
- Section "Riwayat Status" di flight detail (collapsible, urut terbaru).

### #5 — Pencarian penumpang global (PNR / Seat / Tiket)  ⏱ M
**Kenapa**: petugas sering ditanya "penumpang X sudah boarding belum?" — saat ini harus buka flight satu-satu.
**Bangun**:
- Halaman baru `/passengers` atau modal di topbar (Cmd+K style).
- Input: PNR atau Tiket → tampilkan: flight number, status flight, status boarding (sudah/belum), waktu scan terakhir.
- Reuse `getScanEvents()` + index by `parsedPnr` / `parsedTicketNumber`.

---

## 🟡 P1 — Workflow Enhancements

### #6 — Manual override / re-scan reason  ⏱ M
**Kenapa**: ada kasus penumpang asli tapi barcode rusak / duplicate karena re-print. Saat ini sistem reject tanpa jalur manual.
**Bangun**:
- Di hasil scan `DUPLICATE_SCAN` / `INVALID_BARCODE` → tombol "Override (alasan: …)".
- Field `overrideReason?: string` di ScanEvent + status visual berbeda (badge "OVERRIDE").
- Hanya supervisor/admin yang bisa override.

### #7 — Pre-loaded passenger manifest (expected list)  ⏱ L
**Kenapa**: saat ini `expectedPax` cuma angka. Operator yang lebih canggih punya manifest awal (CSV upload) → bisa highlight "siapa yang belum scan" by name/PNR, bukan cuma count.
**Bangun**:
- Field `manifest?: ManifestRow[]` di Flight.
- Form upload CSV di edit flight (kolom: pnr, name, seat, ticket).
- Di BoardingCard → tab "Belum Boarding" (manifest - scanned).
- Cross-match by PNR+Seat.

### #8 — Boarding zone / group  ⏱ M
**Kenapa**: airline modern boarding by group (Group A, B, C, …). Petugas perlu melihat distribusi.
**Bangun**:
- Field `parsedBoardingZone` di ScanEvent (parse dari kolom 23–25 IATA BCBP, optional).
- Grouping di BoardingCard: "Group A: 45/60 · B: 30/80 · C: …".

### #9 — Cancel flight workflow  ⏱ S
**Kenapa**: status `CANCELLED` ada tapi belum ada UX khusus. Saat ini cuma di-set dari Select.
**Bangun**:
- Tombol terpisah "Batalkan Penerbangan" dengan modal alasan (`cancellationReason: string`).
- Highlight visual lebih kuat di list (banner / row dengan strikethrough).

### #10 — Riwayat scan: filter & search lebih kaya  ⏱ S
**Kenapa**: `/scan-events` saat ini list datar. Kalau scan ribuan, susah dilacak.
**Bangun**:
- Filter: tanggal range, flight number, status hasil, user (scannedBy).
- Search free-text untuk PNR / Tiket / Nama.
- Pagination atau virtualisasi list.

### #11 — Print-friendly view  ⏱ S
**Kenapa**: ground ops sering minta print manifest.
**Bangun**:
- `@media print` CSS di globals.
- Tombol "Print" di flight detail → hide sidebar, sembunyikan tombol, layout 1-kolom.

### #12 — Bulk action di list flight  ⏱ M
**Kenapa**: misal mau set semua status DRAFT → OPEN sekaligus saat shift mulai.
**Bangun**:
- Checkbox per row + select-all.
- Action bar muncul saat ada selection: "Set Status…", "Hapus".

---

## 🔵 P2 — UX Polish

### #13 — Camera scanner (mobile)  ⏱ L
**Kenapa**: input barcode saat ini keyboard-only (asumsi scanner USB). Untuk pos darurat / mobile petugas, kamera HP via `BarcodeDetector` API atau lib seperti `@zxing/browser`.
**Bangun**:
- Toggle "Pakai Kamera" di /scan.
- Stream video + decode → isi field rawBarcode otomatis.
- Vibrate + sound feedback saat sukses.

### #14 — Sound + haptic feedback  ⏱ S
**Kenapa**: petugas tidak harus selalu lihat layar.
**Bangun**:
- Web Audio API: beep panjang untuk VALID, beep ganda untuk DUPLICATE/INVALID.
- `navigator.vibrate()` di mobile.
- Toggle on/off di settings.

### #15 — Toast notifications (replace inline alerts)  ⏱ S
**Kenapa**: feedback lebih instan tanpa mengganggu layout.
**Bangun**:
- Toast provider sederhana (`src/components/ui/Toast.tsx`).
- Replace inline `<div className="rose-50…">` di form, scan, dll.

### #16 — Loading skeletons  ⏱ S
**Kenapa**: saat ini hanya "Memuat sesi…" di AppShell. Card-card lain langsung kosong → terasa lompat.
**Bangun**:
- `Skeleton` primitive (shimmer pakai keyframe yang sudah ada).
- Pasang di list flight, dashboard stat cards (sebentar saja, karena data lokal).

### #17 — Empty state illustrations  ⏱ S
**Kenapa**: empty state saat ini cuma teks abu-abu. Bisa lebih ramah dengan icon besar + CTA.
**Bangun**:
- Komponen `<EmptyState icon title description action />`.
- Pakai di /scan-events kosong, /flights kosong, dll.

### #18 — Keyboard shortcuts  ⏱ S
**Kenapa**: throughput tinggi di pos boarding.
**Bangun**:
- `/` fokus ke input scan.
- `Esc` clear result.
- `G F` → flights, `G D` → dashboard (vim-style).
- Tampilkan cheatsheet via `?`.

### #19 — Dark mode  ⏱ M
**Kenapa**: ruang boarding sering remang.
**Bangun**:
- Tailwind `darkMode: "class"`.
- Toggle di AppShell, simpan preference di localStorage.
- Audit semua warna hard-coded (banyak `bg-white`, `text-slate-800`).

### #20 — Settings / profile page  ⏱ M
**Kenapa**: saat ini tidak ada tempat untuk ganti nama, preferensi (sound on/off, dark mode), reset data.
**Bangun**:
- `/settings` dengan tab: Profile, Preferences, Data (reset / export-all / import).

### #21 — User management (admin only)  ⏱ M
**Kenapa**: user di-hardcode di `mockData.ts`. Admin harus bisa CRUD user.
**Bangun**:
- `/users` page (admin only).
- Tabel + tombol Tambah / Edit / Hapus.
- Validasi: tidak boleh hapus diri sendiri, minimal 1 admin tersisa.

---

## ⚪ P3 — Future / Eksperimental

### #22 — Statistik & charts  ⏱ L
- Halaman `/analytics`: scan per jam (bar), distribusi status (donut), top user, top flight.
- Lib ringan: `recharts` atau hand-rolled SVG.

### #23 — Real backend (sinkronisasi multi-device)  ⏱ XL
- localStorage → REST/SQLite/Postgres.
- WebSocket untuk live update (banyak petugas scan flight yang sama).
- Saat ini kalau dua tab dibuka di device berbeda, datanya tidak sync.

### #24 — PWA / offline-ready beneran  ⏱ M
- Manifest + service worker.
- Install prompt di mobile.
- "Offline-ready" sudah diklaim di /login — tapi belum ada SW.

### #25 — Localization (id ↔ en)  ⏱ M
- Saat ini full Bahasa Indonesia.
- Kalau dipakai bandara internasional → butuh switch.

### #26 — Daily auto-archive  ⏱ M
- Setelah H+1, scan events di-archive ke key terpisah.
- Mencegah localStorage membengkak.
- Tombol "Export & purge" di settings.

### #27 — Test suite  ⏱ M
- Unit test untuk `parseBarcode`, `validateScan`, `getBoardingProgress`.
- Vitest + RTL untuk komponen kritis.

---

## Sequencing yang disarankan

```
Sprint 1 (1 minggu): #2 CSV export · #3 Reopen · #4 Audit log
Sprint 2 (1 minggu): #5 Passenger search · #15 Toast · #16 Skeleton
Sprint 3 (1 minggu): #10 Riwayat scan filter · #11 Print · #18 Keyboard
Sprint 4 (2 minggu): #13 Camera scanner · #19 Dark mode
Sprint 5 (backlog): #6 Override · #7 Pre-loaded manifest · #21 User mgmt
```

Mulai dari Sprint 1 — semua S/M, value tinggi, tanpa perubahan arsitektur besar.
