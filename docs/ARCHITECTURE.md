# AFVS — Architecture & Flow Document

Dokumen ini menjelaskan **arsitektur internal**, **alur data**, dan
**aturan validasi** Airport Flight Validation System (AFVS).

---

## 1. Tujuan Aplikasi

AFVS dibuat untuk membantu **petugas bandara** memvalidasi boarding pass
penumpang tanpa perlu mencocokkan dengan data manifest. Sistem hanya
memastikan:

1. Barcode dapat dibaca.
2. Barcode memiliki kode penerbangan.
3. Kode penerbangan terdaftar di jadwal **hari ini**.
4. Flight berstatus aktif (OPEN / ACTIVE).
5. Barcode belum pernah di-scan sebelumnya.

Karena tidak menggunakan manifest, sistem **tidak dapat** menvalidasi
identitas penumpang — itu di luar scope.

---

## 2. High-Level Diagram

```
+---------------------+      +------------------------+
| Barcode Scanner USB | ───► | Input #scan (auto-fc) |
+---------------------+      +-----------+------------+
                                         │ Enter
                                         ▼
                       +-----------------------------+
                       |   scanService.processScan() |
                       +-----------------------------+
                          │             │           │
                          ▼             ▼           ▼
                    parseBarcode  getFlights()  getScanEvents()
                          │             │           │
                          └─────────────┴──── duplicate check
                                       │
                                       ▼
                          +------------------------+
                          | ValidationOutcome      |
                          | + ScanEvent persisted  |
                          +-----------+------------+
                                      │
                                      ▼
                              UI Result Card
                              + Web Audio beep
```

Semua "storage" disimpan di **`window.localStorage`**:

| Key                | Isi                |
| ------------------ | ------------------ |
| `afvs.users`       | Daftar user dummy  |
| `afvs.flights`     | Daftar penerbangan |
| `afvs.scanEvents`  | Log semua scan     |
| `afvs.session`     | User yang login    |
| `afvs.seeded`      | Penanda seed jalan |

---

## 3. Modul Utama

### `src/lib/types.ts`

Berisi semua **type/interface** TypeScript:
`User`, `SessionUser`, `Flight`, `FlightStatus`,
`ScanEvent`, `ScanResultStatus`, `ParsedBarcode`.

### `src/lib/utils.ts`

- `cn()` — utility class merge (Tailwind).
- `todayDateString()` / `tomorrowDateString()` — kunci untuk validasi.
- `formatDateTime()`, `formatTime()` — format ID locale.
- `uid()` — generator ID sederhana.

### `src/lib/mockData.ts`

Membangun **seed** awal: 3 user + 6 flight (mix today & tomorrow,
mix status).

### `src/lib/storage.ts`

Wrapper localStorage:

- `ensureSeed()` — populate sekali saja.
- `resetAll()` — bersihkan & seed ulang.
- CRUD untuk `flights` & `scanEvents`.
- Get/set `session`.

> Semua file ini ditandai `"use client"` karena bergantung pada `window`.

### `src/lib/auth.ts`

Login simulasi:

- Cocokkan `email` + `password` dari `getUsers()`.
- Simpan ke `afvs.session`.
- Helper role: `canManageFlights`, `canScan`.

### `src/lib/scanService.ts`

Inti aplikasi:

```ts
parseBarcode(raw): ParsedBarcode | null   // strict "A|B|C|D"
validateBarcode(raw): ValidationOutcome   // status + message + flight + parsed
processScan(raw, user):                   // validate + persist event
  { outcome, event }
playFeedbackSound(status)                 // Web Audio API beep
```

---

## 4. Aturan Validasi (Decision Tree)

```
INPUT raw
  │
  ├── trim == "" ?              → INVALID_BARCODE
  │
  ├── parts != 4 ?              → INVALID_BARCODE
  │   (or salah satu kosong)
  │
  ├── flight not found ?        → UNKNOWN_FLIGHT
  │
  ├── flight.departureDate
  │    != today                 → FLIGHT_NOT_TODAY
  │
  ├── flight.status not in
  │    {OPEN, ACTIVE}           → FLIGHT_NOT_ACTIVE
  │
  ├── same rawBarcode already
  │    VALID today ?            → DUPLICATE_SCAN
  │
  └── ALL OK                    → VALID_FLIGHT
```

Setiap path tetap **menyimpan ScanEvent** sehingga audit log lengkap.

---

## 5. Role & Routing

| Role       | Akses                                                      |
| ---------- | ---------------------------------------------------------- |
| admin      | Semua halaman (kelola flight + scan + lihat log).          |
| supervisor | Sama seperti admin.                                        |
| security   | Read-only flight, halaman scan, halaman log scan.          |

Penegakan role:

- **Sidebar** menyaring menu berdasarkan `session.role`.
- Halaman `/flights/create` aktif memeriksa role di `useEffect`, redirect
  jika tidak diizinkan.
- Tombol Edit/Delete di list flight di-render bersyarat.

---

## 6. UX Pos Validasi

- Input `<input>` besar (h-16, font mono) di tengah halaman.
- `inputRef.current?.focus()` saat mount + auto-refocus setiap 1.5s
  (`setInterval`) sehingga jika petugas keliru mengklik di tempat lain,
  fokus tetap kembali ke input.
- Submit otomatis saat `onKeyDown` deteksi `Enter`.
- Setelah submit:
  - `value` dikosongkan.
  - Focus dikembalikan dengan `setTimeout(..., 0)` untuk memastikan
    React selesai re-render.
- Hasil ditampilkan sebagai **result card besar** dengan gradient
  background:
  - hijau untuk VALID,
  - kuning untuk DUPLICATE,
  - merah untuk semua error.
- Web Audio API memainkan nada (sine 1100Hz / square 660Hz / 220Hz) untuk
  feedback non-visual.

---

## 7. Penyimpanan & Reset

Karena MVP tidak menggunakan database, semua data hidup di localStorage.
Untuk mereset:

1. DevTools → Application → Local Storage → hapus key `afvs.*`.
2. Refresh — `ensureSeed()` akan menulis ulang data demo.

---

## 8. Batasan & Roadmap

**Batasan saat ini**

- Tidak ada keamanan nyata (password plaintext, role di client).
- Tidak ada real-time sync antar perangkat.
- Tidak ada format barcode IATA BCBP — hanya format MVP `A|B|C|D`.
- Validasi hanya per-hari (today).

**Ide pengembangan**

- Backend Next.js (Route Handlers) + Prisma + SQLite/Postgres.
- Otentikasi JWT/Auth.js.
- Multi-pos & multi-petugas dengan WebSocket.
- Dukungan barcode IATA Boarding Pass standard.
- Export CSV / PDF dari riwayat scan.
- Audit trail dengan reason override.

---

## 9. Quick Reference Selektor UI

| Komponen      | File                                          |
| ------------- | --------------------------------------------- |
| Sidebar/Topbar| `src/components/layout/AppShell.tsx`          |
| Stat Card     | `src/components/ui/StatCard.tsx`              |
| Tabel         | `src/components/ui/Table.tsx`                 |
| Status Badge  | `src/components/ui/StatusBadge.tsx`           |
| Tombol/Input  | `src/components/ui/{Button,Input,Select}.tsx` |
| Result Card   | `src/app/scan/page.tsx` (`<ResultCard />`)    |

---

Dokumentasi ini hidup bersama kode — silakan update saat aturan validasi
berubah.
