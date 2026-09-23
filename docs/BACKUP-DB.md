# Backup & Restore DB — AFVS (MySQL)

Backup melindungi data operasional: manifest penumpang, scan events, akun petugas,
audit, **dan foto wajah** (di `UPLOAD_DIR`, file di disk — bukan di DB, jadi wajib
di-backup terpisah). Skrip di [backend/scripts/](../backend/scripts/):
- `backup-db.sh` — Linux / server on-prem (cron)
- `backup-db.ps1` — Windows / Laragon (Task Scheduler)

Keduanya: dump DB → gzip, arsipkan `uploads`, rotasi otomatis (hapus > `KEEP_DAYS` hari).
Kredensial dibaca dari `backend/.env` (`DATABASE_URL`, `UPLOAD_DIR`) — tak perlu ditulis ulang.

> ⚠️ **Backup yang tak pernah diuji = ilusi aman.** Wajib sekali uji restore (bawah).

## 1. Backup manual (uji cepat)

**Linux:**
```bash
cd backend/scripts
chmod +x backup-db.sh
AFVS_BACKUP_DIR=/var/backups/afvs ./backup-db.sh
```

**Windows (Laragon):** cari path `mysqldump.exe` di `C:\laragon\bin\mysql\...\bin\`.
```powershell
powershell -ExecutionPolicy Bypass -File backend\scripts\backup-db.ps1 `
  -MysqldumpExe "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysqldump.exe" `
  -BackupRoot "C:\backups\afvs"
```

Hasil: `<BackupRoot>/<YYYYMMDD_HHMMSS>/afvs-db.sql.gz` + `uploads.(tar.gz|zip)`.

## 2. Jadwalkan (harian)

**Linux (cron)** — tiap hari 02:00:
```cron
0 2 * * * /path/ke/backend/scripts/backup-db.sh >> /var/log/afvs-backup.log 2>&1
```

**Windows (Task Scheduler)**:
```powershell
$act = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument '-ExecutionPolicy Bypass -File "D:\manifest-ticket-2\backend\scripts\backup-db.ps1" -MysqldumpExe "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysqldump.exe"'
$trg = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -TaskName "AFVS Backup" -Action $act -Trigger $trg -RunLevel Highest
```

## 3. Restore (uji & pemulihan nyata)

> Restore = **menimpa** data. Lakukan ke DB kosong/terpisah saat uji.

**a. Restore DB** (Linux; Windows tinggal ganti path & pakai `gzip -d` / 7-Zip):
```bash
# buat DB uji terpisah supaya tak menimpa produksi saat verifikasi
mysql -h 127.0.0.1 -u root -p -e "CREATE DATABASE afvs_restore_test;"
gunzip < /var/backups/afvs/<STAMP>/afvs-db.sql.gz \
  | mysql -h 127.0.0.1 -u root -p afvs_restore_test
# verifikasi: jumlah baris masuk akal
mysql -u root -p afvs_restore_test -e "SELECT COUNT(*) FROM FlightPassenger; SELECT COUNT(*) FROM ScanEvent;"
```

**b. Restore uploads** (foto wajah):
```bash
tar -xzf /var/backups/afvs/<STAMP>/uploads.tar.gz -C /path/tujuan/backend/
```

**c. Pemulihan produksi nyata** (setelah insiden): stop backend → restore ke DB `afvs`
asli (bukan `_restore_test`) → extract uploads ke `UPLOAD_DIR` → `npx prisma generate`
(bila perlu) → start backend.

## 4. Checklist uji restore (lakukan 1× sebelum go-live, lalu berkala)

- [ ] Jalankan backup manual → file `.sql.gz` & arsip uploads terbentuk, ukuran wajar.
- [ ] Restore ke `afvs_restore_test` tanpa error.
- [ ] `COUNT(*)` tabel utama (`FlightPassenger`, `ScanEvent`, `Operator`, `Flight`) masuk akal.
- [ ] Extract uploads → jumlah file foto sesuai.
- [ ] Drop `afvs_restore_test` setelah verifikasi.
- [ ] Cron/Task terjadwal aktif & log backup terisi keesokan harinya.

## 5. Praktik baik

- **3-2-1**: ≥1 salinan **off-site** (bukan di server yang sama) — mis. sinkron `BackupRoot` ke storage lain/NAS.
- Simpan retensi selaras kebijakan (default skrip 14 hari; foto biometrik juga tunduk `FACE_RETENTION_DAYS`).
- Lindungi folder backup (berisi data pribadi) — permission ketat, idealnya terenkripsi at-rest.
