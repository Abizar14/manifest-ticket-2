# Rancangan: Jalur "Tanpa KTP" + Mode Keluarga (rush-friendly)

> Status: **SUDAH DIIMPLEMENTASIKAN** (versi sederhana). Dokumen ini
> menjelaskan desain, alur, file yang disentuh, dan kebijakannya.
>
> Sudah jalan: tombol "Tanpa KTP (anak/bayi)" di kiosk (muncul saat mode
> **KTP-first** aktif), cabang `exempted` yang melewati `KTP_MISMATCH`,
> rekam di `ktpVerification` (audit — siapa petugas via `scannedBy`), badge
> "dikonfirmasi petugas" di modal hasil, dan **toggle di halaman Pengaturan**.
>
> **Mode Keluarga (auto-taut ke ortu) DIHAPUS** — dianggap over-engineering &
> berpotensi klaim palsu (tautannya hanya berdasarkan waktu). Konfirmasi anak
> via KK/Akte cukup dilakukan **petugas secara visual** (lebih jujur & sederhana).
> Belum: opsi foto KK/Akte sebagai arsip (non-blocking).

## Tujuan
Menangani penumpang **anak/bayi yang tidak punya KTP** dengan cepat saat antrian
padat, **tanpa OCR KK/Akte**, **tanpa merusak** alur KTP otomatis yang sudah ada,
dan **tetap ada jejak audit** (pertanggungjawaban petugas).

Prinsip: **KTP = otomatis (95% kasus, tak diubah). Anak tanpa KTP = 1 tap +
konfirmasi petugas + audit.**

---

## Alur petugas (mode `ktpScanFirst`)

**Normal (tidak berubah):**
KTP di kamera → scan boarding pass → nama dicocokkan otomatis → Valid/Tolak.

**Baru — anak tanpa KTP:**
1. Petugas tap tombol **"Tanpa KTP (anak/bayi)"** di layar kiosk.
2. Petugas scan boarding pass anak.
3. Sistem **lewati** pencocokan nama KTP, tandai **Valid** dengan label
   *"Tanpa KTP — anak"*, lalu **catat audit** (siapa, kapan, flight, alasan,
   nama pendamping). Lanjut ke penumpang berikutnya.

**Catatan: Mode Keluarga (auto-taut ke ortu) sudah DIHAPUS.** Awalnya dirancang
untuk menautkan anak ke "ortu terakhir yang lolos KTP" berdasarkan waktu — tapi
itu klaim lemah (bisa salah pasangan) & menambah kerumitan. Konfirmasi anak via
KK/Akte cukup dilakukan **petugas secara visual**, dan jejaknya tercatat lewat
`scannedBy` (siapa petugas yang meloloskan).

---

## Perubahan data (model)

`KtpVerification` di `src/lib/types.ts` — tambah:
- `status`: tambah nilai **`"exempted"`** (selain `matched` | `mismatch`).
- `exemptReason?: "child" | "infant" | "other"`

Identitas petugas yang mengonfirmasi sudah tersimpan di `scannedBy` (audit).

Status hasil scan **tetap `VALID_FLIGHT`** (supaya lolos seperti biasa), hanya
`ktpVerification.status = "exempted"` sebagai penanda. Tidak perlu menambah enum
status baru di mana-mana.

---

## Titik integrasi kode (rencana)

| File | Perubahan |
|---|---|
| `src/lib/types.ts` | Perluas `KtpVerification` (status `exempted` + field exempt). |
| `src/lib/settings.ts` | Flag baru: `allowNoKtpExemption` (default true), `noKtpRequireGuardian` (default false), `familyModeWindowSec` (default 120). |
| `src/app/scan/kiosk/page.tsx` | (1) State `exemptNext` + `lastVerifiedAdult`. (2) Tombol **"Tanpa KTP"**. (3) Di handler submit [~baris 630-675](../src/app/scan/kiosk/page.tsx#L630-L675): jika `exemptNext` aktif & `outcome.status === "VALID_FLIGHT"` → **lewati** blok pencocokan, set `ktpVerification.status="exempted"`, isi reason+guardian, JANGAN set `KTP_MISMATCH`. (4) Saat scan lolos match → simpan ke `lastVerifiedAdult`. |
| `src/lib/audit.ts` | Helper audit `KTP_EXEMPT` (officer, child name, guardian, reason, flight, waktu). |
| `src/app/scan-events/page.tsx` & `src/app/admin/scans/page.tsx` | Badge **"Tanpa KTP (anak)"** + nama pendamping di riwayat. |
| *(opsional)* `facePhotoStore` | Tombol "foto KK/Akte" → simpan di latar (non-blocking) sebagai arsip. Off saat rush. |

**Yang TIDAK berubah:** seluruh jalur pencocokan KTP otomatis. Tidak ada OCR
KK/Akte sama sekali.

---

## Optimasi antrian padat
- Tombol "Tanpa KTP" = **1 tap**, tanpa modal penghalang, tanpa dropdown
  (alasan default "anak"; "other" lewat aksi sekunder).
- Nama pendamping **terisi otomatis** dari ortu terakhir (Mode Keluarga).
- Foto dokumen **opsional & non-blocking** — tak menahan antrian.

---

## Kebijakan & pengaman
- Pengecualian **hanya** boleh saat boarding pass-nya **`VALID_FLIGHT`** — yang
  dilewati cuma langkah identitas, **bukan** validasi penerbangan.
- **Setiap pengecualian tercatat** → bisa direview supervisor di `/admin/scans`.
- *(opsional)* Insight/alert bila jumlah pengecualian melonjak (anti-penyalahgunaan).
- Untuk Akte yang ingin diarsipkan: simpan **foto** saja (bukan OCR) — penilaian
  tetap di mata petugas.

---

## Ringkasan
Otomatis untuk mayoritas (KTP), **1-tap + audit** untuk anak, **Mode Keluarga**
biar rombongan cepat. Ringan dibangun (tombol + cabang di handler + badge riwayat),
tahan banting, dan sesuai praktik lapangan.
