# Modul Aplikasi — Airport Flight Validation System (AFVS)

> Sistem validasi boarding pass berbasis web untuk operator gate bandara.
> Versi: 0.1.0 · Repository: `airport-flight-validation`

---

## 1. Tentang Aplikasi

**AFVS (Airport Flight Validation System)** adalah aplikasi web internal yang membantu petugas gate memvalidasi boarding pass penumpang secara cepat, akurat, dan ter-audit. Aplikasi dirancang **offline-first**: seluruh data flight, scan event, foto wajah, dan konfigurasi disimpan lokal di browser sehingga gate tetap operasional walau koneksi internet putus.

### Target Pengguna

| Role | Hak Akses |
|------|-----------|
| **Admin** | Manajemen flight, user, settings global |
| **Supervisor** | Pemantauan dashboard, analytics, audit log |
| **Security / Petugas Gate** | Scan boarding pass, lihat scan history |

### Use Case Utama

1. Petugas gate scan boarding pass penumpang sebelum boarding pesawat.
2. Aplikasi memverifikasi: flight benar, hari benar, tiket belum di-scan sebelumnya.
3. Foto wajah penumpang diambil otomatis untuk audit visual.
4. Hasil scan + foto tersimpan dan bisa di-review supervisor.

---

## 2. Arsitektur Singkat

```
┌─────────────────────────────────────────────────────────────┐
│              Next.js 14 (App Router) — Frontend             │
├─────────────────────────────────────────────────────────────┤
│  React Components  ·  Tailwind CSS  ·  Lucide Icons         │
├─────────────────────────────────────────────────────────────┤
│           Lib Layer (lib/*)                                 │
│  scanService · storage · settings · auth · flightStatus     │
├─────────────────────────────────────────────────────────────┤
│  Persistence (Browser)                                       │
│  · localStorage  →  flights, scan events, settings, session │
│  · IndexedDB     →  foto wajah (Blob)                       │
└─────────────────────────────────────────────────────────────┘
```

**Tanpa backend.** Semua logic + data di sisi klien. Cocok untuk single-gate atau prototyping. Migrasi ke backend bisa dilakukan dengan mengganti implementasi `lib/storage.ts` dan `lib/facePhotoStore.ts` tanpa mengubah komponen.

---

## 3. Daftar Modul / Halaman

| Route | Halaman | Untuk |
|-------|---------|-------|
| `/login` | Login | Semua user |
| `/onboarding` | First-run tutorial | First-time user |
| `/dashboard` | Dashboard ringkasan flight + stats | Supervisor, Admin |
| `/flights` | List flight (CRUD, status, audit) | Admin |
| `/passengers` | List penumpang (dari scan history) | Supervisor |
| `/scan` | Halaman scan utama (camera/USB/manual) | Security |
| `/scan/kiosk` | Mode kiosk fullscreen (monitor gate) | Security |
| `/scan-events` | Riwayat scan event + foto wajah | Supervisor, Security |
| `/analytics` | Grafik & analitik scan | Supervisor, Admin |
| `/settings` | Konfigurasi user & aplikasi | Semua user (sebagian admin only) |
| `/seeders` | Generator data demo | Admin (dev only) |

---

## 4. Fitur Utama

### 4.1 Autentikasi & Session
- Login berbasis email + password (data user disimpan di `localStorage`).
- Role-based access: Admin, Supervisor, Security.
- Session persisten sampai logout manual.

### 4.2 Manajemen Flight
- **CRUD flight**: tambah, edit, hapus, dengan field: flight number, airline code, origin/destination airport, tanggal & jam keberangkatan, gate, jumlah pax expected.
- **Status flight** (lifecycle): `DRAFT → OPEN → ACTIVE → CLOSED` atau `CANCELLED`.
- **Audit trail**: setiap perubahan status tercatat dengan timestamp + user.
- **Boarding window otomatis**: status `OPEN/ACTIVE/CLOSED` di-compute dari waktu keberangkatan dan threshold di settings (default: open 60 min sebelum, active 30 min sebelum, close 10 min sesudah).

### 4.3 Boarding Pass & Penumpang
- Parser barcode format `FLIGHT|PNR|TICKET|SEAT` (separator `|` atau `,` atau whitespace).
- **Seed boarding passes** — 25+ data dummy untuk demo (5 maskapai × 5 penumpang).
- **Passenger record** — agregasi otomatis dari scan event: nama, PNR, ticket, seat, jumlah scan, first/last scan.

### 4.4 Sistem Scan
Tiga mode input yang bisa di-switch di header `/scan`:

| Mode | Cara Pakai | Cocok Untuk |
|------|-----------|-------------|
| **Camera** | Buka webcam, deteksi QR/barcode otomatis | Phone scanner, tablet kios |
| **USB Scanner** | Field input auto-focus, scanner USB ketik string + Enter | Monitor gate + handheld scanner |
| **Manual** | Operator ketik manual | Backup saat scanner mati |

**Outcome scan:**
- `VALID_FLIGHT` — boarding pass valid, belum pernah di-scan.
- `DUPLICATE_SCAN` — tiket sudah di-scan sebelumnya.
- `FLIGHT_NOT_TODAY` — flight bukan hari ini.
- `FLIGHT_NOT_ACTIVE` — flight belum dibuka atau sudah ditutup.
- `UNKNOWN_FLIGHT` — flight number tidak ada di database.
- `INVALID_BARCODE` — format barcode tidak dikenali.

Setiap outcome memberi feedback **audio (beep berbeda)** + **haptic (getar mobile)** + **toast**.

### 4.5 Mode Kiosk (`/scan/kiosk`)
Halaman fullscreen khusus monitor gate, tanpa navbar.

- **Layout dua panel**: webcam wajah (kiri) + scan & result (kanan).
- **USB scanner ready** — hidden input auto-focus tiap 500ms, deteksi heuristik kecepatan ketik untuk membedakan scanner vs typing manual.
- **Validasi wajah pre-scan** — scan ditolak kalau wajah tidak terdeteksi/menghadap kamera (bisa di-toggle di settings).
- **Capture wajah otomatis** — setiap scan menyimpan foto wajah dari webcam (~25KB JPEG) di IndexedDB, ter-link via `event.faceCaptureId`.
- **Boarding pass animated modal** — saat VALID, modal tampilkan tiket dengan **gradient warna maskapai**, foto wajah, dan badge "VERIFIED".
- **Auto-close 6 detik** dengan countdown bar; tombol X manual.
- **Session stats di header** — counter Valid/Duplicate/Ditolak per shift.
- **Demo scan button** — inject barcode sample untuk training operator tanpa scanner fisik.
- **Reset button** — clear stats + recent list.
- **Sound on/off chip** — toggle cepat suara feedback di header.
- **Heuristic detection notice** — banner peringatan kalau browser tidak support FaceDetector API (fallback ke deteksi skin-tone YCbCr).
- **Privacy banner** — info bahwa foto disimpan lokal, tidak dikirim ke server.

### 4.6 Riwayat Scan (`/scan-events`)
- Daftar semua scan event dengan filter status, tanggal, flight.
- Thumbnail foto wajah inline (48×48), klik untuk full size.
- Export ke **CSV** & **XLSX**.
- Auto-archive otomatis: scan event hari lampau bisa di-purge sesuai kebijakan.

### 4.7 Dashboard & Analytics
- **Dashboard** — premium stat cards (flight hari ini, scan total, success rate), hero section airport-themed.
- **Analytics** — chart distribusi scan per jam, breakdown per maskapai, top gates.

### 4.8 Settings
Disimpan di `localStorage` key `afvs.settings`:

| Setting | Default | Fungsi |
|---------|---------|--------|
| `soundOn` | true | Suara feedback per outcome |
| `hapticOn` | true | Getar mobile |
| `locale` | `id` | Bahasa (ID/EN) |
| `theme` | `airport` | Tema (airport / dark) |
| `flightListShowOnlyToday` | true | Filter list flight hari ini saja |
| `autoClosePastDayFlights` | true | Auto-CLOSE flight hari lampau |
| `boardingOpenMinutesBefore` | 60 | Window buka boarding |
| `boardingActiveMinutesBefore` | 30 | Window active boarding |
| `boardingCloseMinutesAfter` | 10 | Window tutup boarding |
| `faceCaptureEnabled` | true | Aktifkan webcam capture |
| `faceCameraDeviceId` | null | Pilih webcam (jika >1) |
| `kioskAutoEnter` | false | Auto-submit di kiosk tanpa Enter |
| `requireFaceForScan` | true | Scan ditolak kalau wajah tidak siap |

### 4.9 Theming & Aksesibilitas
- **Dua tema**: `airport` (light, cool blue/cyan) & `dark` (midnight aviation).
- Toggle di header semua halaman.
- Token CSS variable di [globals.css](src/app/globals.css), kelas semantik di [tailwind.config.ts](tailwind.config.ts).
- Tipografi: **Poppins** dari Google Fonts.
- Icons: **lucide-react** (consistent line icons).

### 4.10 Offline Capability
- ✅ Semua data lokal (localStorage + IndexedDB).
- ✅ Tidak ada API call ke backend.
- ⚠️ Barcode image di modal boarding pass masih fetch ke `barcodeapi.org` (bisa di-replace `bwip-js` lokal).
- ⚠️ Asset Next.js perlu di-load minimal sekali; full offline butuh setup PWA + service worker.

### 4.11 Mobile-Ready
- Layout responsif: desktop grid 3-kolom, mobile single-column dengan bottom navigation.
- Touch-friendly: button minimal 44×44px (Apple HIG).
- Komponen mobile khusus: `BottomNav`, `SegmentedControl`, `StickyActionBar`, `GroupedList`.

---

## 5. Alur Penggunaan Tipikal

### Operator Gate (per shift)
1. Login ke `/login`.
2. Buka mode kiosk di `/scan/kiosk` (fullscreen di monitor gate).
3. Colok scanner USB → badge "Scanner USB ✓" muncul.
4. Penumpang datang → wajah masuk kamera → operator scan boarding pass.
5. Modal hijau muncul (jika VALID) → boarding pass + foto + countdown 6 detik → otomatis close.
6. Untuk VALID, penumpang dipersilakan masuk; untuk DUPLICATE/REJECTED, eskalasi sesuai SOP.
7. Akhir shift: lihat stats di header, tap "Reset" untuk shift berikutnya.

### Supervisor (review)
1. Login.
2. Buka `/dashboard` — lihat ringkasan hari ini.
3. Buka `/scan-events` — review scan event + foto wajah.
4. Export CSV/XLSX untuk laporan.
5. Buka `/analytics` — lihat tren per jam/maskapai.

### Admin (setup)
1. Buka `/flights` — input flight hari ini (atau import dari sistem lain).
2. Set status flight ke `OPEN` saat siap boarding.
3. Buka `/settings` — sesuaikan threshold boarding window per gate.
4. Buat user baru untuk petugas baru.

---

## 6. Struktur Direktori

```
src/
├── app/                      # Routes (Next.js App Router)
│   ├── analytics/
│   ├── dashboard/
│   ├── flights/
│   ├── login/
│   ├── onboarding/
│   ├── passengers/
│   ├── scan/
│   │   ├── kiosk/page.tsx    # Mode kiosk fullscreen
│   │   └── page.tsx          # Scan standard
│   ├── scan-events/
│   ├── seeders/              # Demo data generator
│   └── settings/
├── components/
│   ├── dashboard/            # AirportHero, PremiumStatCard
│   ├── flights/              # SeatMap, PassengerDetailModal
│   ├── layout/               # AppShell, BottomNav, PageHero
│   ├── mobile/               # Mobile-specific components
│   ├── print/                # Print-friendly views
│   ├── providers/            # React context providers
│   ├── scan/                 # CameraScanner, FaceCaptureCamera, FaceThumb
│   └── ui/                   # Base components (Button, Modal, Toast, etc.)
└── lib/
    ├── airlines.ts           # Registry maskapai + warna brand
    ├── audit.ts              # Audit log helpers
    ├── auth.ts               # Login & session
    ├── boarding.ts           # Logic boarding window
    ├── csvExport.ts          # Export CSV
    ├── facePhotoStore.ts     # IndexedDB wrapper untuk foto
    ├── flightStatus.ts       # State machine flight
    ├── flightSweeper.ts      # Auto-close past flights
    ├── i18n.ts + useT.ts     # Translation
    ├── mockData.ts           # Seed flights
    ├── scanService.ts        # Core logic scan + face capture
    ├── seedBoardingPasses.ts # Seed boarding pass sample
    ├── settings.ts           # App settings (localStorage)
    ├── storage.ts            # localStorage wrapper
    ├── theme.ts              # Theme switcher
    ├── types.ts              # TypeScript types
    ├── useCountUp.ts         # Animation hook
    ├── utils.ts              # cn() classname merger
    └── xlsxExport.ts         # Export XLSX
```

---

## 7. Stack Teknis

| Kategori | Teknologi |
|----------|-----------|
| Framework | Next.js 14 (App Router) |
| Bahasa | TypeScript |
| UI | React 18 |
| Styling | Tailwind CSS + CSS variables |
| Icons | lucide-react |
| Font | Poppins (Google Fonts) |
| State | React hooks (no Redux/Zustand) |
| Persistence | localStorage + IndexedDB |
| Scanner Lib | Native `BarcodeDetector` + Web FaceDetector API |
| Build | npm / Next.js compiler |
| Dev Server | `npm run dev:https` (HTTPS untuk getUserMedia di non-localhost) |

---

## 8. Roadmap (Future Enhancements)

- [ ] Backend sync (REST API + Postgres) untuk multi-gate
- [ ] Service worker → full offline PWA
- [ ] Replace barcode CDN dengan `bwip-js` lokal
- [ ] Active flight panel di kiosk header
- [ ] Persistent shift stats (sessionStorage)
- [ ] Confirm dialog untuk Reset
- [ ] Idle warning (no scan > 5 min)
- [ ] Visible manual input toggle di kiosk
- [ ] Background sync foto wajah → S3
- [ ] Multi-language: tambah EN content
- [ ] WCAG AA audit & screen reader test

---

## 9. Glosari

| Istilah | Arti |
|---------|------|
| **AFVS** | Airport Flight Validation System (nama aplikasi) |
| **PNR** | Passenger Name Record (kode booking) |
| **Boarding window** | Rentang waktu di mana flight terbuka untuk boarding |
| **Kiosk mode** | Mode fullscreen untuk monitor gate, tanpa nav |
| **Face capture** | Foto wajah otomatis saat scan, untuk audit visual |
| **Heuristic detection** | Deteksi wajah fallback berbasis warna kulit YCbCr (saat FaceDetector API tidak tersedia) |
| **Duplicate scan** | Tiket yang sudah pernah di-scan sebelumnya |
| **Gate** | Pintu boarding penumpang di terminal |
