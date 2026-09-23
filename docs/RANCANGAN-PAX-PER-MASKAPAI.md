# Rancangan: Rekap Penumpang per Maskapai (harian & historis)

Status: **TERIMPLEMENTASI** (2026-07-03). Keputusan: angka = boarded, periode
Hari ini/Kemarin/Rentang, halaman baru `/rekap-maskapai` (menu admin/supervisor).
Verifikasi E2E: agregasi per maskapai benar (GA 3, ID 3, sisanya 0), terurut pax
desc, drill-down flight. Helper murni di-unit-test (32 test FE hijau).
Lanjutan dari [RANCANGAN-MANIFEST-PAX.md](RANCANGAN-MANIFEST-PAX.md) (manifest per-flight sudah jalan).

## 1. Cara menyebut fiturnya (istilah)

Kalimat singkat yang bisa dipakai saat menjelaskan/minta fitur ini:

> "**Rekap penumpang per maskapai** — lihat jumlah pax yang sudah boarding
> dikelompokkan per maskapai (Garuda sendiri, Batik sendiri, Lion sendiri, dst.),
> bisa difilter **per tanggal**: hari ini, kemarin, atau rentang tanggal."

Istilah pendek yang konsisten dipakai di UI/kode:
- **Rekap Maskapai** / **PAX per Maskapai** (judul menu)
- **Rollup** = agregasi/penjumlahan (istilah teknis)
- **Boarded** = penumpang yang boarding pass-nya sudah scan VALID
- Periode: **Hari ini · Kemarin · Rentang** (custom `dari`–`sampai`)

## 2. Tujuan

Satu layar untuk menjawab: "Hari ini/kemarin, tiap maskapai berapa penumpang yang
sudah boarding, tersebar di berapa penerbangan?" — plus bisa drill-down ke daftar
penerbangan tiap maskapai, lalu ke daftar pax tiap penerbangan (manifest yang sudah ada).

## 3. Sumber data (TIDAK perlu tabel baru)

Semua sudah tersedia — cukup **agregasi**:
- `FlightPassenger` (manifest per-flight, sudah ada) → jumlah pax per flight.
- `Flight.airlineCode` (sudah ada di backend & lokal) → pengelompokan maskapai.
- `Flight.std` → filter tanggal.
- Registry `src/lib/airlines.ts` (`getAirlineMeta`) → nama, warna brand, logo maskapai.

Rumus: **pax per maskapai (tanggal X)** = jumlah `FlightPassenger` di semua `Flight`
yang `airlineCode = M` dan `std` di tanggal X.

## 4. Backend (NestJS)

Endpoint baru (module `flights` atau module baru `reports`):

```
GET /api/manifests/by-airline?date=YYYY-MM-DD
GET /api/manifests/by-airline?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Respons:
```jsonc
{
  "range": { "from": "2026-07-03", "to": "2026-07-03" },
  "totals": { "passengers": 512, "flights": 24, "airlines": 6 },
  "airlines": [
    { "airlineCode": "GA", "passengers": 180, "flights": 6,
      "flightsDetail": [ { "flightId": "...", "flightNumber": "GA123", "std": "...", "passengers": 32 } ] },
    { "airlineCode": "ID", "passengers": 120, "flights": 5, "flightsDetail": [ ... ] }
  ]
}
```

Implementasi: `groupBy`/agregasi Prisma —
`flightPassenger.groupBy({ by: flightId })` lalu join ke Flight untuk airlineCode +
std, dikelompokkan per airlineCode. Scoping F-05 (operator hanya station-nya).
`flightsDetail` opsional (query `?detail=1`) supaya payload ringkas by default.

## 5. Frontend

### Halaman / lokasi
Opsi (lihat §8): **halaman baru `/insights/maskapai`** atau **tab di `/analytics`**.
Rekomendasi: tab/section di **`/analytics`** (sudah tempat tren per jam/maskapai),
plus kartu ringkas di `/dashboard`.

### Komponen UI
- **Pemilih periode**: chip `Hari ini` · `Kemarin` · `Rentang` (date range picker).
- **Grid kartu maskapai**: tiap kartu = logo + warna brand (dari `getAirlineMeta`),
  angka pax besar, sub-teks "N penerbangan". Urut pax desc.
- **Drill-down**: klik kartu → daftar penerbangan maskapai itu (nomor, jam, pax) →
  klik penerbangan → halaman detail flight (manifest pax yang sudah ada).
- **Export**: tombol Export Excel rekap (reuse `xlsxExport.ts`).

### Sumber data
- Bila `apiSyncEnabled` → tarik dari endpoint server (sumber kebenaran lintas-device).
- Offline → agregasi lokal dari `afvs.manifests` + `afvs.flights` (helper murni baru
  `src/lib/reports/byAirline.ts`, dapat di-unit-test).

## 6. Reuse yang sudah ada
- `getAirlineMeta` (nama/warna/logo) — tinggal pakai.
- `AirlineLogo` component.
- `xlsxExport.ts` untuk export.
- Manifest per-flight + halaman detail flight (drill-down tujuan akhir).

## 7. Rencana kerja (urutan)
1. Helper murni `reports/byAirline.ts` (agregasi + unit test) — lokal.
2. Backend endpoint `GET /manifests/by-airline` (date & range, scoping F-05).
3. `client.ts`: `apiManifestByAirline({ date | from,to })`.
4. UI: pemilih periode + grid kartu maskapai + drill-down (server, fallback lokal).
5. Kartu ringkas "Top maskapai hari ini" di dashboard (opsional).
6. Export Excel rekap.
7. Update docs (MODUL_APLIKASI + BACKEND_SETUP).

## 8. Keputusan yang perlu dikonfirmasi
- [ ] Letak: **tab di /analytics** (rekomendasi) vs **halaman baru** vs **section di /dashboard**.
- [ ] Angka pax = **boarded (scan VALID)** saja (rekomendasi, konsisten manifest) —
      atau juga tampilkan **expected/kapasitas** per maskapai untuk perbandingan?
- [ ] Rentang tanggal: cukup **Hari ini/Kemarin + custom range**, atau perlu preset
      "7 hari terakhir / bulan ini"?
- [ ] Drill-down pax lintas-tanggal perlu, atau cukup sampai daftar penerbangan?

## 9. Catatan
- Tak ada perubahan skema DB — murni agregasi data yang sudah tercatat manifest.
- Bergantung pada manifest terisi benar (butuh flightId ter-resolve — sudah
  diperbaiki: resolusi `flightNumber+tanggal`, lihat RANCANGAN-MANIFEST-PAX §5).
- Akurasi historis bergantung ketersediaan data manifest tanggal tsb.
