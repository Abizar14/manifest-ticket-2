# Airport Flight Validation System (AFVS)

Aplikasi web sederhana untuk **petugas/security bandara** yang ingin memvalidasi **boarding pass** penumpang sebelum masuk ke ruang keberangkatan.

> Aplikasi ini **tidak** menggunakan data manifest. Validasi hanya dilakukan
> terhadap **kode penerbangan** yang ada di barcode boarding pass — apakah ia
> terdaftar pada jadwal **hari ini**, statusnya **aktif**, dan **belum** pernah
> di-scan sebelumnya.

---

## Tech Stack

- **Next.js 14 (App Router)**
- **React 18 + TypeScript**
- **Tailwind CSS** (UI bergaya shadcn — clean, modern, light mode)
- **Poppins** font (Google Fonts)
- **localStorage** sebagai simulasi penyimpanan (tidak butuh backend / DB)
- **Lucide Icons**
- **Web Audio API** untuk feedback suara saat scan

---

## Menjalankan Project Secara Lokal

### 1. Persiapan

Pastikan sudah terpasang:

- Node.js **>= 18.17**
- npm / pnpm / yarn

### 2. Install dependencies

```bash
npm install
```

### 3. Jalankan dev server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### 4. Build produksi (opsional)

```bash
npm run build
npm run start
```

---

## Akun Demo

| Role       | Email                     | Password   |
| ---------- | ------------------------- | ---------- |
| Admin      | `admin@airport.test`      | `password` |
| Supervisor | `supervisor@airport.test` | `password` |
| Security   | `security@airport.test`   | `password` |

> Klik salah satu kartu pada halaman login untuk auto-fill.

---

## Hak Akses (Role)

| Halaman          | Admin | Supervisor | Security |
| ---------------- | :---: | :--------: | :------: |
| `/dashboard`     |  ✅   |     ✅     |    ✅    |
| `/flights` (lihat) |  ✅   |     ✅     |    ✅    |
| `/flights/create`|  ✅   |     ✅     |    ❌    |
| Ubah/Hapus flight |  ✅   |     ✅     |    ❌    |
| `/scan`          |  ✅   |     ✅     |    ✅    |
| `/scan-events`   |  ✅   |     ✅     |    ✅    |

---

## Format Barcode (MVP)

```
FLIGHT|PNR|TICKET|SEAT
```

Contoh:

```
GA123|AB12CD|990001|12A
```

Hasil parsing:

- `flightNumber` = `GA123`
- `pnr` = `AB12CD`
- `ticketNumber` = `990001`
- `seatNumber` = `12A`

---

## Cara Memakai Scanner

Aplikasi mendukung **barcode scanner USB/Bluetooth (keyboard-wedge)**:

1. Buka halaman `/scan`.
2. Cursor otomatis fokus ke input besar.
3. Scan barcode → scanner mengetik karakter + menekan **Enter**.
4. Aplikasi otomatis memproses, menampilkan hasil, lalu mengosongkan input
   dan mengembalikan fokus.
5. Tidak perlu klik tombol Submit.

> Jika tidak punya scanner fisik, Anda bisa mengetik manual dan menekan
> **Enter** untuk simulasi.

---

## Aturan Validasi

Status hasil scan:

| Status             | Kondisi                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `INVALID_BARCODE`  | Barcode kosong atau format bukan `FLIGHT\|PNR\|TICKET\|SEAT`        |
| `UNKNOWN_FLIGHT`   | `flightNumber` tidak ada di data flight                             |
| `FLIGHT_NOT_TODAY` | Flight ditemukan, tapi `departureDate` bukan hari ini               |
| `FLIGHT_NOT_ACTIVE`| Status flight bukan `OPEN` atau `ACTIVE`                            |
| `DUPLICATE_SCAN`   | Barcode persis sama sudah pernah valid hari ini                     |
| `VALID_FLIGHT`     | Lolos semua pengecekan                                              |

**Semua scan** (termasuk yang gagal) tersimpan ke `scanEvents`.

---

## Halaman

| Path              | Deskripsi                                            |
| ----------------- | ---------------------------------------------------- |
| `/login`          | Login simulasi                                       |
| `/dashboard`      | Statistik, flight hari ini, scan terbaru             |
| `/flights`        | Daftar penerbangan + filter (tanggal/status/cari)    |
| `/flights/create` | Form tambah penerbangan (admin/supervisor saja)      |
| `/scan`           | Pos validasi: input besar + result card + flight list|
| `/scan-events`    | Riwayat lengkap aktivitas scan                       |

---

## Struktur Project

```
src/
├── app/
│   ├── layout.tsx              # root layout + font Poppins
│   ├── globals.css             # tailwind + tema
│   ├── page.tsx                # redirect (login/dashboard)
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── flights/
│   │   ├── page.tsx            # list flights
│   │   └── create/page.tsx     # create flight
│   ├── scan/page.tsx           # pos validasi
│   └── scan-events/page.tsx    # riwayat scan
│
├── components/
│   ├── layout/
│   │   └── AppShell.tsx        # sidebar + topbar (responsive)
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── StatCard.tsx
│       ├── StatusBadge.tsx
│       └── Table.tsx
│
└── lib/
    ├── types.ts                # semua tipe TypeScript
    ├── utils.ts                # cn(), tanggal, uid()
    ├── mockData.ts             # seed users & flights
    ├── storage.ts              # wrapper localStorage
    ├── auth.ts                 # login / logout / role
    └── scanService.ts          # parse + validate + sound
```

---

## Data Model

### Flight

```ts
{
  id: string;
  flightNumber: string;          // "GA123"
  airlineCode: string;           // "GA"
  originAirport: string;         // "CGK"
  destinationAirport: string;    // "DPS"
  departureDate: string;         // "YYYY-MM-DD"
  departureTime: string;         // "HH:mm"
  gateOrCheckpoint: string;      // "Gate A1"
  status: "DRAFT" | "OPEN" | "ACTIVE" | "CLOSED" | "CANCELLED";
}
```

### ScanEvent

```ts
{
  id: string;
  rawBarcode: string;
  parsedFlightNumber: string | null;
  parsedPnr: string | null;
  parsedTicketNumber: string | null;
  parsedSeatNumber: string | null;
  resultStatus: ScanResultStatus;
  message: string;
  flightId: string | null;
  scannedBy: string;             // email petugas
  scannedAt: string;             // ISO
}
```

---

## Reset Data

Karena memakai `localStorage`, data dapat dihapus dari DevTools:

```
Application > Local Storage > http://localhost:3000 > clear
```

Refresh halaman, seed default akan diisi ulang.

---

## Catatan MVP

- Tidak ada backend, semua logika di sisi browser.
- Aman digunakan offline.
- Bukan untuk produksi — autentikasi sengaja disederhanakan (password
  plaintext di seed) untuk demonstrasi.

Selamat mencoba ✈️
