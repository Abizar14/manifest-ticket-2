# Design Spec — Airport Flight Validation System (Web)

> Style guide & komponen sebagai acuan saat membuat mockup di **Figma / Sketch / Adobe XD**.
> Fokus: tampilan web (desktop + mobile responsive). Tema: **Airport (light)** + **Dark (midnight aviation)**.

---

## 1. Brand Identity

### Konsep Visual
- **Tema utama**: "Modern airport terminal" — bersih, profesional, biru aviation.
- **Mood**: Tenang, dapat diandalkan, premium tapi tidak corporate kaku.
- **Inspirasi**: Apple HIG (rounded, generous spacing) × airline industry (gradient maskapai, boarding pass aesthetics).

### Logo / Mark
- Icon utama: **ShieldCheck** (lucide-react) di gradient `cyan-400 → blue-600`, rounded square 36×36 dengan shadow `shadow-lg shadow-cyan-500/30`.
- Wordmark: "AFVS" atau "AIRPORT FLIGHT VALIDATION" — Poppins Black, tracking-wide 0.18em, uppercase.

---

## 2. Color Palette

### 2.1 Theme: Airport (Light, Default)

| Token | Hex | Tailwind | Use |
|-------|-----|----------|-----|
| `--bg-page-from` | `#F8FAFC` | slate-50 | Background page (top-left) |
| `--bg-page-mid` | `#EEF6FF` | sky-50 | Background page (mid) |
| `--bg-page-to` | `#F0FDFF` | cyan-50 | Background page (bottom-right) |
| `--surface` | `#F7FAFF` | — | Card background |
| `--surface-2` | `#EDF4FC` | — | Input / hover surface |
| `--surface-elev` | `#FFFFFF` | white | Elevated card / modal |
| `--hairline` | `#D1DEF0` | — | Border default |
| `--hairline-soft` | `#E2EBF7` | — | Border soft (dividers) |
| `--text` | `#0F172A` | slate-900 | Primary text |
| `--text-muted` | `#64748B` | slate-500 | Secondary text |
| `--text-subtle` | `#94A3B8` | slate-400 | Tertiary / placeholder |

### 2.2 Theme: Dark (Midnight Aviation)

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-page-from` | `#081224` | Background page (top) |
| `--bg-page-mid` | `#0B1A2E` | Background page (mid) |
| `--bg-page-to` | `#061020` | Background page (bottom) |
| `--surface` | `#112035` | Card background |
| `--surface-2` | `#172943` | Input / hover |
| `--surface-elev` | `#1A2E4C` | Elevated card / modal |
| `--hairline` | `#1E3A63` | Border |
| `--text` | `#E2E8F0` | Primary text (slate-200) |
| `--text-muted` | `#94A3B8` | Secondary (slate-400) |

### 2.3 Brand Colors

| Token | Light Hex | Dark Hex | Tailwind |
|-------|-----------|----------|----------|
| `--brand` | `#2563EB` | `#60A5FA` | blue-600 / blue-400 |
| `--brand-2` | `#38BDF8` | `#38BDF8` | sky-400 |
| `--brand-3` | `#06B6D4` | `#22D3EE` | cyan-500 / cyan-400 |

**Brand gradient (primary CTA):**
```
linear-gradient(135deg, #06B6D4 0%, #2563EB 100%)
```

### 2.4 Semantic Colors

| Status | Light | Dark | Use Case |
|--------|-------|------|----------|
| **Success** | `#10B981` emerald-500 | `#34D399` emerald-400 | VALID scan, OK state |
| **Warning** | `#F59E0B` amber-500 | `#FBBF24` amber-400 | DUPLICATE, idle warning |
| **Danger** | `#F43F5E` rose-500 | `#FB7185` rose-400 | REJECTED, error |
| **Info** | `#3B82F6` blue-500 | `#60A5FA` blue-400 | Notice umum |

Setiap semantik punya varian:
- **Solid background**: e.g. `bg-emerald-500`
- **Soft tinted bg**: e.g. `bg-emerald-500/15` + `ring-emerald-500/40`
- **Text**: `text-emerald-700` (light) / `text-emerald-300` (dark)
- **Glow shadow**: `shadow-[0_0_60px_-12px_rgba(16,185,129,0.55)]`

### 2.5 Airline Brand Colors

Tiap maskapai punya **gradient + solid + text + ring**. Lihat [src/lib/airlines.ts](src/lib/airlines.ts).

| Code | Maskapai | Gradient | Solid |
|------|----------|----------|-------|
| GA | Garuda Indonesia | `from-sky-700 via-blue-600 to-cyan-500` | `bg-sky-700` |
| JT | Lion Air | `from-rose-600 via-red-600 to-orange-500` | `bg-red-600` |
| ID | Batik Air | `from-blue-800 via-blue-700 to-indigo-600` | `bg-blue-800` |
| QZ | Indonesia AirAsia | `from-rose-600 via-pink-600 to-red-500` | `bg-rose-600` |
| SJ | Sriwijaya Air | `from-red-700 via-red-600 to-rose-500` | `bg-red-700` |
| IW | Wings Air | `from-amber-500 via-orange-500 to-red-500` | `bg-orange-500` |
| QG | Citilink | `from-emerald-600 via-green-500 to-lime-500` | `bg-emerald-600` |
| IU | Super Air Jet | `from-fuchsia-600 via-pink-500 to-rose-500` | `bg-pink-600` |
| SAA | Smart Aviation | `from-sky-600 via-cyan-500 to-blue-500` | `bg-sky-600` |
| IP | Pelita Air | `from-blue-600 via-cyan-500 to-emerald-500` | `bg-cyan-600` |

---

## 3. Typography

### Font Family
- **Primary**: `Poppins` (Google Fonts, weight 300–900).
- **Fallback**: `ui-sans-serif`, `system-ui`, `sans-serif`.
- **Mono**: stack default (`ui-monospace`) — untuk PNR, ticket number, kode flight.

### Type Scale

| Token | Size | Weight | Tracking | Use |
|-------|------|--------|----------|-----|
| Display | 56–72px | 900 (black) | -0.02em | Hero flight number di modal kiosk |
| H1 | 36px | 800 | -0.01em | Page title |
| H2 | 28px | 700 | -0.005em | Section header |
| H3 | 20px | 700 | normal | Card title |
| Body L | 16px | 500 | normal | Body default |
| Body | 14px | 400/500 | normal | Body small |
| Body S | 12px | 500 | normal | Meta info |
| Caption | 11px | 600 | 0.16em uppercase | Label tabel, badge |
| Micro | 9–10px | 700/900 | 0.18–0.25em uppercase | Pill mikro, status |

### Pola Kombinasi
- **Stat card big number**: 4xl font-black tabular-nums (`text-slate-900` / `text-ink`).
- **Card label**: `text-[10px] font-bold uppercase tracking-[0.16em]` warna `text-slate-400` (light) / `text-ink-subtle` (dark).
- **Code/PNR**: `font-mono tracking-widest text-sm font-bold`.

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (Tailwind default)
`0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24` (× 4px).

### 4.2 Page Container
- **Desktop**: `max-w-7xl mx-auto px-6` (1280px content area).
- **Tablet**: `px-5`.
- **Mobile**: `px-4`.
- Vertical rhythm: `py-6` antar section.

### 4.3 Grid Patterns
- **Dashboard**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` (stat cards).
- **Scan page**: `grid lg:grid-cols-[1fr_320px] gap-6` (main + sidebar).
- **Kiosk**: `grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4` (panel kiri webcam + panel kanan result).
- **List**: 1-column stack dengan `divide-y` antar item.

### 4.4 Border Radius
| Token | Size | Use |
|-------|------|-----|
| `rounded-md` | 6px | Small input |
| `rounded-lg` | 8px | Input default, button kecil |
| `rounded-xl` | 12px | Button utama, icon container |
| `rounded-2xl` | 16px | Card |
| `rounded-3xl` | 24px | Modal, large card, panel |
| `rounded-full` | — | Chip, badge, avatar |

### 4.5 Elevation / Shadow
- `shadow-soft` — `0 8px 24px -12px rgba(15,23,42,0.12)` (default card)
- `shadow-card` — `0 6px 18px -8px rgba(37,99,235,0.18)` (branded lift)
- `shadow-lift` — `0 16px 40px rgba(37,99,235,0.14)` (hover state)
- `shadow-glow` — `0 0 0 6px rgba(37,99,235,0.12)` (focus ring)

---

## 5. Component Library

Setiap komponen harus di-mockup dalam **3 state** minimum: `default`, `hover`, `disabled` (atau `active` untuk toggle).

### 5.1 Button
- **Primary**: gradient brand, white text, `rounded-xl px-4 py-2.5 text-sm font-bold`.
- **Secondary**: `bg-surface-2 ring-1 ring-hairline text-ink`.
- **Ghost**: text only + hover `bg-surface-2`.
- **Danger**: `bg-gradient-to-br from-rose-500 to-pink-600 text-white`.
- **Icon button**: `h-8 w-8 rounded-full` (header), `h-10 w-10 rounded-xl` (card).

### 5.2 Input
- Height: `h-10` default, `h-12` mobile.
- Style: `rounded-xl ring-1 ring-hairline bg-surface px-3.5`.
- Focus: `ring-2 ring-brand/40`.
- Error: `ring-rose-400`.

### 5.3 Card
- Base: `rounded-2xl bg-surface ring-1 ring-hairline shadow-soft p-5`.
- Glass variant (kiosk): `bg-white/70 backdrop-blur` (light) / `bg-[#0c1a36]/80` (dark).
- Premium variant (dashboard): gradient overlay + animated shimmer.

### 5.4 Chip / Badge
- Pill: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1`.
- Status pill examples:
  - Scanner: `bg-emerald-100 text-emerald-700 ring-emerald-300`
  - Manual: `bg-amber-100 text-amber-700 ring-amber-300`
  - Idle: `bg-slate-900/5 text-slate-600 ring-slate-200`

### 5.5 Modal
- Overlay: `bg-slate-900/60 backdrop-blur-sm`.
- Container: `rounded-3xl bg-surface-elev shadow-2xl`.
- Size: `sm 384px`, `md 480px`, `lg 640px`, `xl 800px`, `full`.
- Header: icon + title + close X (top-right).
- Footer: actions (right-aligned) atau custom (e.g. countdown bar).
- Tone variant: success/warning/danger/info/brand (mempengaruhi icon bg + accent bar).

### 5.6 Toast
- Position: top-right (desktop), top-center (mobile).
- Type: success / warning / error / info.
- Auto-dismiss: 4s default.
- Layout: icon + title + body, swipe to dismiss.

### 5.7 Table / List
- **Table** (desktop): `divide-y` rows, sticky header dengan `bg-surface-2`.
- **List** (mobile): `GroupedList` ala iOS — header section + rows dengan icon di kiri.

### 5.8 Stat Card
- Premium variant: gradient bg, animated count-up, icon kanan atas, label kecil + value besar + delta.
- Compact variant: flat, icon + label + value sebaris.

### 5.9 Bottom Nav (Mobile)
- 4–5 tabs, icon + label kecil.
- Active state: brand color + underline atau filled pill.
- Floating action: center scan button (gradient circle 56×56).

### 5.10 Boarding Pass (Modal di Kiosk)
- Layout 3-column: **MAIN (1fr) | PERFORATION (auto) | STUB (220px)**.
- Header: logo maskapai + nama + "Boarding Pass".
- Main body: Name → From/To dengan plane icon di tengah → Detail grid (Date, Flight, Seat, Gate, Boarding, Class, Seq, Ticket) → Barcode.
- Stub: face photo + key details + PNR.
- Aksen warna pakai maskapai (lihat tabel 2.5).
- Perforation visual: dashed line + circular notches.

### 5.11 Face Camera HUD (Kiosk)
- Corner brackets di 4 sudut (cyan border).
- Concentric rings + reticle di center (rotating slow).
- Side HUD (kanan/kiri): face state pill ("Face Detected" / "Cari Wajah" / "Terlalu Jauh").
- Top-center banner: gate status (rose=no face, amber=adjust, emerald=ready).
- Scan line animation (cyan horizontal sweep).
- "Webcam Live" pill kiri atas dengan red dot pulsing.

---

## 6. Iconography

- **Library**: lucide-react (line icons, stroke 2px).
- **Size standard**: 14px (chip), 16px (button), 20px (header), 24px (card), 32–48px (modal hero).
- **Common icons**:
  - Scan: `Scan`, `ScanLine`, `QrCode`
  - Status: `CheckCircle2`, `XCircle`, `AlertTriangle`
  - Travel: `Plane`, `Armchair`, `Briefcase`
  - User: `User`, `Users`, `CircleUserRound`, `ShieldCheck`
  - Input: `Keyboard`, `Usb`, `Camera`, `CameraOff`
  - Utility: `Clock`, `Sun`, `Moon`, `Volume2`, `VolumeX`, `RotateCcw`, `X`, `ArrowRight`

---

## 7. Animation & Motion

Animasi custom didefinisikan di [tailwind.config.ts](tailwind.config.ts):

| Animation | Duration | Use |
|-----------|----------|-----|
| `fade-up` | 0.5s ease-out | Card masuk (page load) |
| `fade-in` | 0.4s ease-out | Modal/toast appear |
| `badge-pop` | 0.35s ease-out | Status badge first render |
| `pulse-glow` | 2.2s loop | CTA "live" indicator |
| `pulse-glow-emerald/rose` | 2s loop | Success/error pulse |
| `shimmer` | 2.4s loop | Skeleton loader |
| `float` | 3.5s loop | Hero element subtle bob |
| `spin-slow` | 22s linear | Kiosk webcam ring |
| `scan-line` | 2.4s | Kiosk scan beam |
| `check-pop` | 0.6s bouncy | Success checkmark |
| `bp-rise` | 0.7s | Boarding pass entry |
| `wave` | 1.1s loop | Audio waveform bars |
| `flash-once` | 0.35s | Capture flash effect |

**Easing reference**: `cubic-bezier(0.2, 0.8, 0.2, 1)` (Apple-style spring) untuk masuk; `ease-in-out` untuk loop.

---

## 8. Screen Catalog (untuk Mockup)

Setiap screen di-mockup dalam **3 viewport**:
- **Desktop**: 1440 × 900
- **Tablet**: 768 × 1024
- **Mobile**: 390 × 844 (iPhone 14 size)

Dan dalam **2 tema**: light + dark.

| # | Screen | Layout | Catatan Khusus |
|---|--------|--------|-----------------|
| 1 | Login | Centered card, max-w-md | Logo gradient di atas, email + password, tombol login |
| 2 | Onboarding (3 step) | Hero + step indicator | Carousel atau wizard |
| 3 | Dashboard | Hero airport + 4 stat cards + recent activity | Background pattern subtle |
| 4 | Flights — List | Header + filter chips + table | Status pill per row |
| 5 | Flights — Detail | Sticky header + seat map + passenger list | Tabs untuk audit log |
| 6 | Flights — Create/Edit | Modal atau full page form | Step-by-step |
| 7 | Passengers | Search bar + grouped list | Avatar + nama + flight info |
| 8 | Scan (standard) | Mode picker top + camera/USB/manual area + recent | 3 variant per mode |
| 9 | Scan — Kiosk Mode | Fullscreen 2-panel (webcam + result) | Detail di sec 5.11 |
| 10 | Scan — Modal VALID | Boarding pass design dengan airline color | Detail di sec 5.10 |
| 11 | Scan — Modal REJECTED | Tone danger, flight info ringkas | Foto wajah di kanan |
| 12 | Scan Events | Table dengan thumbnail foto + filter | Export CSV/XLSX button |
| 13 | Analytics | Charts (hourly, per airline, top gates) | Recharts atau Chart.js style |
| 14 | Settings | Grouped list (mobile) atau 2-col (desktop) | Toggles + radio + dropdown |
| 15 | Seeders (dev) | Action grid (generate flights, BP, scans) | Confirm dialog before action |
| 16 | 404 / Error | Centered illustration + back button | Plane "lost" theme |

---

## 9. Responsive Breakpoints

| Breakpoint | Tailwind | Min-width | Layout Change |
|------------|----------|-----------|---------------|
| Mobile | (default) | 0px | Single column, bottom nav, full-width cards |
| Tablet | `md:` | 768px | Sidebar muncul, 2-column grid |
| Desktop | `lg:` | 1024px | Full sidebar, 3-column grid |
| Wide | `xl:` | 1280px | Max content width, generous spacing |
| Ultra-wide | `2xl:` | 1536px | Optional: extra info panel |

**Mobile-first**: design mobile dulu, lalu enhance.

---

## 10. Aksesibilitas (WCAG AA)

- **Contrast ratio**:
  - Text on background: **4.5:1** minimum.
  - Text on brand gradient: gunakan white/black yang lulus contrast (cek dengan tool).
  - Pill text: pastikan tetap readable di 11px.
- **Focus visible**: ring 2px brand color + offset.
- **Tap target**: minimum 44×44px (mobile).
- **Motion**: respect `prefers-reduced-motion` — disable animasi loop yang tidak esensial.
- **Color independence**: status TIDAK boleh hanya warna — selalu ada icon + label text.

---

## 11. Asset Untuk Diunduh / Dipakai di Figma

### Font
- Poppins: https://fonts.google.com/specimen/Poppins

### Icon Set
- Lucide: https://lucide.dev (export SVG dari sini).

### Plugin Figma Berguna
- **Iconify** — auto-import lucide icons.
- **Tailwind CSS** — convert tokens ↔ Tailwind class.
- **Stark** — contrast checker.

### Asset Lokal (sudah ada di repo)
- Airline logos: [public/airlines/](public/airlines/) — `GA.png`, `ID.png`, `IW.png`, `QG.png`, `IU.png`, `SAA.png`.
- Asset cards: [public/asset-cards/](public/asset-cards/) — `mode-kiosk.png`.

---

## 12. Naming Convention untuk File Figma

Saran struktur:
```
AFVS Design System.fig
├── 🎨 Foundations
│   ├── Colors (Light + Dark)
│   ├── Typography
│   ├── Spacing & Grid
│   ├── Elevation
│   └── Iconography
├── 🧩 Components
│   ├── Button
│   ├── Card
│   ├── Modal
│   ├── Toast
│   ├── Chip
│   ├── Boarding Pass
│   └── Face Camera HUD
├── 📱 Mobile Screens
│   └── (16 screens × light/dark)
├── 💻 Desktop Screens
│   └── (16 screens × light/dark)
└── 📐 Flows
    ├── Operator Gate Flow
    ├── Supervisor Review Flow
    └── Admin Setup Flow
```

---

## 13. Reference

- Kode konfigurasi tema: [src/app/globals.css](src/app/globals.css)
- Tailwind config: [tailwind.config.ts](tailwind.config.ts)
- Komponen UI base: [src/components/ui/](src/components/ui/)
- Airline registry: [src/lib/airlines.ts](src/lib/airlines.ts)
- Kiosk mode reference: [src/app/scan/kiosk/page.tsx](src/app/scan/kiosk/page.tsx)
