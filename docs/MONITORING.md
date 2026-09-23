# Monitoring & Log — AFVS

Tujuan: **tahu duluan** kalau backend/DB bermasalah (sebelum petugas panik), dan
punya jejak untuk menelusuri insiden.

## 0. Endpoint health (sudah tersedia)

`GET /api/health` (publik, tanpa throttle — F-13). Mengecek koneksi DB:
```json
{ "status": "ok", "db": true, "ts": "2026-07-04T01:23:45.000Z" }
```
- `status: "ok"` + `db: true` → sehat.
- `status: "degraded"` / `db: false` → backend hidup tapi **DB tak terjangkau**.
- Tidak ada respons / timeout → backend mati.

Monitor harus menganggap **gagal** bila HTTP ≠ 200 **atau** body `status != "ok"`.

## 1. Uptime monitoring

### A. Ada akses internet (domain publik) — termudah
Pakai layanan gratis: **UptimeRobot**, **Healthchecks.io**, atau **Better Stack**.
- Target: `https://domain-anda/api/health`
- Interval: 1–5 menit
- Alert: email / Telegram / WhatsApp / Slack
- (UptimeRobot Pro/Healthchecks bisa cek isi body `status:"ok"`.)

### B. On-prem LAN tanpa internet — skrip internal + webhook
Jalankan cron di server (atau mesin lain di LAN) yang nembak health & kirim alert
saat gagal berturut-turut. Contoh (`check-health.sh`, cron tiap 2 menit):
```bash
#!/usr/bin/env bash
URL="http://127.0.0.1:3001/api/health"
HOOK="https://hooks.slack.com/services/XXX"   # atau webhook Telegram/WA gateway
res="$(curl -fsS --max-time 5 "$URL" 2>/dev/null || echo "DOWN")"
if ! echo "$res" | grep -q '"status":"ok"'; then
  curl -fsS -X POST "$HOOK" -H 'Content-Type: application/json' \
    -d "{\"text\":\"⚠️ AFVS health GAGAL: $res @ $(hostname) $(date)\"}" >/dev/null || true
fi
```
```cron
*/2 * * * * /path/check-health.sh >> /var/log/afvs-health.log 2>&1
```
> Idealnya jalankan monitor dari **mesin berbeda** dari server app, supaya kalau
> servernya mati total, alert tetap terkirim.

## 2. Log backend (agregasi & rotasi)

### Sudah ada
- **Sentry** (env-gated) menangkap **error/exception** + global exception filter.
  Aktifkan dengan set `SENTRY_DSN` di `.env` produksi. Ini menangkap *crash*, bukan
  semua kejadian operasional.

### Direkomendasikan
- **PM2** (proses manager) otomatis menyimpan stdout/stderr ke file & bisa dirotasi:
  ```bash
  pm2 start dist/src/main.js --name afvs-api
  pm2 install pm2-logrotate           # rotasi otomatis (ukuran/harian)
  pm2 set pm2-logrotate:max_size 50M
  pm2 set pm2-logrotate:retain 14
  pm2 save && pm2 startup             # auto-start saat server reboot
  ```
  Log ada di `~/.pm2/logs/afvs-api-*.log`.
- **Lanjutan (opsional)**: kirim log ke agregator terpusat (Grafana Loki, Better
  Stack Logs, atau ELK) bila butuh pencarian lintas-waktu & dashboard.

## 3. Yang perlu dipantau (harian, minggu pertama)

- [ ] Uptime `/api/health` hijau (alert tak berbunyi palsu).
- [ ] Sentry: tak ada error baru yang berulang.
- [ ] Log PM2: tak ada exception/EADDRINUSE/koneksi DB putus.
- [ ] Disk server: folder `uploads` (foto) & backup tidak membuat disk penuh.
- [ ] Backup harian benar-benar terbentuk (lihat [BACKUP-DB.md](BACKUP-DB.md)).

## 4. Metrik operasional (dari dalam app)
Selain infra, pantau kesehatan **data** lewat UI yang sudah ada:
- `/admin/scans` — aliran scan gabungan 2 pos (kalau salah satu pos berhenti kirim → anomali).
- `/rekap-maskapai` & detail flight — pastikan manifest terisi (deteksi dini masalah `flightId`).
