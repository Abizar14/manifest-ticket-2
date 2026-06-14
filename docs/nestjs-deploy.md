# Deploy AFVS NestJS Backend di Proxmox VM Ubuntu

## 1. Provisioning Proxmox VM

Spec untuk 1-5 gate (~10k scan/hari + Postgres):

- 4 vCPU
- 4 GB RAM
- 40 GB disk SSD
- Ubuntu Server 22.04 LTS
- Network bridge: `vmbr0`
- Static IP (mis. `192.168.1.51`)

SSH masuk sebagai user non-root (tambah ke `sudo`).

## 2. Install Node.js 20 LTS + Postgres + Nginx + UFW

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl ca-certificates gnupg ufw nginx certbot python3-certbot-nginx postgresql postgresql-contrib

# Node 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
sudo npm i -g pnpm pm2
```

## 3. Setup Postgres

```bash
sudo -u postgres psql <<'SQL'
CREATE USER afvs WITH PASSWORD 'GANTI_PASSWORD_KUAT';
CREATE DATABASE afvs OWNER afvs;
GRANT ALL PRIVILEGES ON DATABASE afvs TO afvs;
SQL
```

Edit `/etc/postgresql/14/main/pg_hba.conf` — pastikan baris untuk `afvs` user pakai `scram-sha-256`. Restart: `sudo systemctl restart postgresql`.

## 4. Deploy aplikasi

```bash
# Sebagai user app (bukan root)
sudo useradd -m -s /bin/bash afvs
sudo su - afvs
git clone <repo-url> ~/manifest-ticket-2
cd ~/manifest-ticket-2/backend
cp .env.example .env
nano .env       # isi DATABASE_URL, JWT_SECRET (>=32 char random), SEED_ADMIN_*

pnpm install --frozen-lockfile
npx prisma generate
npx prisma migrate deploy
npx ts-node prisma/seed.ts

pnpm run build
```

## 5. systemd via PM2

```bash
# Sebagai user afvs
pm2 start dist/main.js --name afvs-backend --time
pm2 save

# Sebagai sudo, generate systemd startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u afvs --hp /home/afvs
sudo systemctl enable pm2-afvs
```

Cek: `pm2 status` & `pm2 logs afvs-backend`.

## 6. Nginx reverse proxy + Let's Encrypt

`/etc/nginx/sites-available/afvs`:

```nginx
server {
  listen 80;
  server_name api.afvs.example.com;

  client_max_body_size 4m;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/afvs /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.afvs.example.com   # auto HTTPS
```

LAN-only? Skip Let's Encrypt, generate self-signed cert + install di tiap klien.

## 7. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 8. Backup harian

`/etc/cron.daily/afvs-backup`:

```bash
#!/bin/bash
set -e
DATE=$(date +%F)
DEST=/var/backups/afvs
mkdir -p "$DEST"

# Postgres dump
sudo -u postgres pg_dump afvs | gzip > "$DEST/afvs-${DATE}.sql.gz"

# Upload folder (foto)
tar -czf "$DEST/uploads-${DATE}.tar.gz" -C /home/afvs/manifest-ticket-2/backend uploads

# Retention 14 hari
find "$DEST" -name 'afvs-*.sql.gz' -mtime +14 -delete
find "$DEST" -name 'uploads-*.tar.gz' -mtime +14 -delete
```

```bash
sudo chmod +x /etc/cron.daily/afvs-backup
```

Snapshot VM Proxmox mingguan via Datacenter → Backup Schedule.

## 9. Konfigurasi klien Next.js

Frontend kiosk perlu env:

```bash
NEXT_PUBLIC_AFVS_API_BASE=https://api.afvs.example.com/api
```

Lalu wire-up:
- Login operator (`POST /auth/login` → simpan JWT di localStorage)
- Outbox flush ke `POST /scan-events` (multipart), idempotent by `eventId`
- Sinkronisasi flights via `GET /flights?station=...&date=YYYY-MM-DD` saat startup kiosk

## 10. Monitoring

- `pm2 monit` — CPU/RAM realtime
- `pm2 logs afvs-backend --lines 100`
- Postgres: `sudo -u postgres psql -d afvs -c "SELECT count(*) FROM \"ScanEvent\";"`
- Disk uploads: `du -sh ~/manifest-ticket-2/backend/uploads`

## Estimasi kapasitas

- Scan event row: ~1 KB
- Foto wajah JPEG (320×240): ~25 KB
- 10k scan/hari × 26 KB = ~260 MB/hari → ~7.5 GB/bulan
- Disk 40 GB cukup ~5 bulan tanpa cleanup. Tambah retention foto > 30 hari via job harian (TODO).

## Update aplikasi

```bash
cd ~/manifest-ticket-2/backend
git pull
pnpm install --frozen-lockfile
npx prisma migrate deploy
pnpm run build
pm2 restart afvs-backend
```

## Rollback cepat

PM2 simpan instance lama di memory sampai `pm2 restart`. Untuk rollback DB pakai backup `pg_dump`:

```bash
sudo -u postgres dropdb afvs
sudo -u postgres createdb afvs -O afvs
gunzip -c /var/backups/afvs/afvs-YYYY-MM-DD.sql.gz | sudo -u postgres psql afvs
```
