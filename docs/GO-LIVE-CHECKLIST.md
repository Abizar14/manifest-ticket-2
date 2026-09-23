# Checklist Go-Live — AFVS

Daftar periksa sebelum & saat menaikkan aplikasi ke produksi (memegang data
penumpang nyata). Urut: keamanan/infra → verifikasi fungsional → operasional.

## A. Blocker keamanan & infra (WAJIB sebelum data riil)

- [ ] **HTTPS aktif** untuk frontend **dan** backend (satu domain via reverse proxy).
      Tanpa HTTPS, **kamera tidak bisa dibuka** (face capture / scan kamera / KTP)
      di akses non-localhost, dan API HTTPS→HTTP kena blok *mixed content*.
- [ ] `NODE_ENV=production` di backend (mengaktifkan fail-fast F-03 & mematikan Swagger F-12).
- [ ] `.env` produksi terisi dari `.env.production.example`:
  - [ ] `DATABASE_URL` pakai **user MySQL khusus berhak minimal** (BUKAN `root`).
  - [ ] `JWT_SECRET` & `PIN_LOOKUP_SECRET` acak ≥32 char (`openssl rand -base64 48`).
  - [ ] `CORS_ORIGIN` = domain frontend HTTPS resmi (bukan localhost).
- [ ] **Akun/PIN demo dimatikan** (`SEED_ALLOW_DEMO` tidak true) & password admin default diganti.
- [ ] MySQL hanya listen `127.0.0.1` (atau firewall) — tidak terekspos publik.
- [ ] **Backup DB + uploads terjadwal** aktif & **1× uji restore** lulus — lihat [BACKUP-DB.md](BACKUP-DB.md).
- [ ] (Kepatuhan UU PDP) teks persetujuan/consent, kebijakan retensi, kontrol akses
      terdokumentasi; idealnya **pentest pihak ketiga** sebelum data riil.

## B. Verifikasi fungsional (uji dengan perangkat & data ASLI)

> Uji ini penting karena test internal pakai data buatan.

### B1. Validasi station ↔ flightId (KRITIS)
Latar: flight disimpan level bandara (`station=AAP`), scan ditandai level pos
(`SCP2`/`BLUESKY`). Resolusi `flightId` sudah ditambal pakai **flightNumber + tanggal**
(abaikan station). **Wajib divalidasi dengan boarding pass asli**:

- [ ] Tarik jadwal hari-H (FIDS) → flight muncul di `/flights` & `/jadwal`.
- [ ] Login **petugas asli** di tiap pos (SCP2 & BLUESKY), bukan admin.
- [ ] Scan **beberapa boarding pass nyata** di tiap pos → hasil VALID.
- [ ] Buka **detail flight** terkait → penumpang **muncul** di manifest (bukan kosong).
- [ ] Buka **Rekap Maskapai** (hari ini) → jumlah pax per maskapai bertambah sesuai scan.
- [ ] Cek server: `SELECT COUNT(*) FROM FlightPassenger WHERE flightId IS NOT NULL` naik.
- [ ] **Bila manifest tetap kosong** setelah scan → `flightId` gagal resolve. Cek:
      nomor flight hasil parse barcode (BCBP) vs nomor di jadwal (normalisasi spasi/strip),
      dan tanggal scan vs `std` flight harus sama. Sesuaikan normalisasi bila perlu.

### B2. Kamera & scan
- [ ] Face capture jalan (butuh HTTPS) — foto tersimpan & tampil auth-gated.
- [ ] Scan via **scanner USB** jalan (tak butuh kamera).
- [ ] Scan barcode via **kamera** jalan (butuh HTTPS).
- [ ] Verifikasi KTP (OCR) jalan sesuai SOP.
- [ ] Duplicate scan & flight tidak aktif → ditolak dengan pesan benar.

### B3. Sinkronisasi & offline
- [ ] Matikan jaringan sebentar saat scan → scan tetap tercatat (offline), lalu
      auto-flush ke server saat online (cek antrian di `/connect`).
- [ ] Dashboard server `/admin/scans` menampilkan scan gabungan 2 pos.

## C. Operasional pasca-deploy

- [ ] **Uptime monitoring** `GET /api/health` + alert (lihat [MONITORING.md](MONITORING.md)).
- [ ] **Log** backend berotasi (PM2) & error masuk **Sentry**.
- [ ] Proses backend auto-restart (PM2/systemd) & auto-start saat server reboot.
- [ ] Dokumen kredensial & prosedur (reset PIN, tambah petugas via `/admin/officers`)
      diserahkan ke admin operasional.
- [ ] Rencana rollback: cara stop layanan + restore backup bila rilis bermasalah.

## D. Setelah go-live (minggu pertama)
- [ ] Pantau Sentry & log tiap hari.
- [ ] Verifikasi backup harian benar-benar terbentuk.
- [ ] Tinjau kembali `FlightPassenger`/rekap vs jumlah boarding aktual (akurasi).
