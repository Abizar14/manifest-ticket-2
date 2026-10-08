# Integrasi laporan PJP2U finance_blu

SIPANDAI menyediakan API khusus untuk pembandingan laporan PJP2U di aplikasi Laravel `C:\laragon\www\finance_blu`. Implementasi keuangan dan panduan operator ada di `docs/INTEGRASI-SIPANDAI.md` pada proyek tersebut.

## Konfigurasi

Tambahkan `FINANCE_INTEGRATION_TOKEN` acak minimal 32 karakter pada `backend/.env`. Token kosong atau terlalu pendek menonaktifkan akses. Jangan commit token. Restart backend setelah mengganti konfigurasi.

Pada finance_blu, aktifkan `SIPANDAI_ENABLED=true`, atur `SIPANDAI_URL=http://127.0.0.1:3001/api` untuk lokal, dan `SIPANDAI_TOKEN` yang sama. Gunakan HTTPS untuk server lain. Jalankan migrasi `2026_10_07_000001_create_sipandai_reconciliations_table.php`. Pemetaan mitra ke kode maskapai diatur pada detail laporan oleh pengelola jasa.

## Endpoint

`GET /api/integrations/finance/manifests?from=2026-10-07&to=2026-10-07&airline=GA`

Header: `Authorization: Bearer TOKEN`. Token ini terpisah dari JWT operator. Akses tetap terkena pembatasan laju global backend. Periode maksimal 31 hari dan menggunakan batas hari WITA. Data dibatasi keberangkatan `HOME_IATA` (default AAP) dan satu kode maskapai.

Respons schemaVersion 1 menyediakan rentang, zona waktu, kode maskapai, waktu snapshot, `basis=valid_scans_not_confirmed_boarding`, dan penerbangan (ID, nomor, maskapai, STD, tujuan, status, jumlah penumpang manifest). Semua status disertakan agar penerbangan dibatalkan atau belum ditutup terlihat dalam pemeriksaan. Tidak ada data identitas penumpang.

## Batas operasional

Manifest terbentuk dari scan valid, bukan konfirmasi keberangkatan. Deduplikasi PNR dan pencatatan manifest best-effort yang sudah ada belum diubah. Karena itu aplikasi keuangan menampilkan data sebagai pembanding, mensyaratkan catatan rekonsiliasi, dan mempertahankan kategori serta perhitungan tagihan pada laporan. Angka yang sama tidak dianggap persetujuan otomatis.

Pengambilan data tidak membuat tagihan. Versi pengambilan dan pemeriksaan disimpan di keuangan. Laporan yang berubah perlu pengambilan ulang; laporan yang telah diverifikasi atau ditagihkan terkunci.

## Pengujian

Backend: `npm test -- --runInBand finance-manifest.controller.spec.ts`, `npx tsc --noEmit --incremental false`, dan `npm run build` dari direktori backend. Keuangan: `php artisan test --filter=SipandaiReconciliationTest` menggunakan SQLite memori, bukan data MySQL lokal.
