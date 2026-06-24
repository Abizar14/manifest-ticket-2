# Ringkasan & Perbandingan Audit — AFVS

Indeks dua modul audit untuk aplikasi **AFVS / si-pandai**, beserta fungsi, kegunaan, keunggulan, dan kekurangan masing-masing.

| Modul | Tanggal | Verdict | Status |
| --- | --- | --- | --- |
| 🔐 [AUDIT-KEAMANAN.md](AUDIT-KEAMANAN.md) | 23 Jun 2026 | 🔴→🟠 sisa infra/kebijakan | 13 temuan — **5 selesai + 6 sebagian**; sisa murni infra/hukum |
| ⚡ [AUDIT-PERFORMA.md](AUDIT-PERFORMA.md) | 24 Jun 2026 | 🟡 Cukup, ada bottleneck | 18 temuan — **14 selesai + P-18 ◑** |

---

## 1. Perbandingan Umum

| Aspek | 🔐 Audit Keamanan | ⚡ Audit Performa |
| --- | --- | --- |
| **Fungsi** | Cari celah keamanan & risiko kebocoran data | Cari sumber lambat/berat & jaga kecepatan |
| **Kegunaan** | Gerbang kelayakan sebelum *go-live* | Kualitas pengalaman pengguna harian |
| **Fokus** | Auth, perlindungan data (UU PDP), config produksi | Gambar, render klien, polling, query & index DB |
| **Pertanyaan kunci** | "Aman & patuh hukum?" | "Cepat & stabil saat skala naik?" |
| **Verdict** | 🔴 Belum layak deploy | 🟡 Cukup, ada bottleneck |
| **Jumlah temuan** | 13 (F-01…F-13) | 18 (P-01…P-18) |
| **Status** | Belum dikerjakan | 3 selesai (P-01, P-10, P-11) |
| **Dampak bila diabaikan** | Ambil-alih sistem, bocor data, langgar UU PDP | App lemot, kuota boros, kiosk nge-lag |

---

## 2. Keunggulan (kelebihan tiap audit)

| 🔐 Audit Keamanan | ⚡ Audit Performa |
| --- | --- |
| Mencegah risiko hukum & reputasi paling fatal | Hasil cepat terasa & terukur (gambar −97%) |
| Wajib sebelum memegang data penumpang nyata | Mayoritas perbaikan berisiko rendah |
| Banyak temuan besar tapi cepat ditutup (config/secret) | Langsung menaikkan kepuasan pengguna harian |

---

## 3. Kekurangan (batas tiap audit)

| 🔐 Audit Keamanan | ⚡ Audit Performa |
| --- | --- |
| Tidak menjamin aplikasi cepat | Tidak menutup celah keamanan |
| Sebagian butuh keputusan hukum/kebijakan | "O(N)" analisis kode, belum benchmark riil |
| Perlu uji penetrasi pihak ketiga | Sebagian relevan hanya saat data sudah besar |

---

## 4. Kesimpulan: keduanya saling melengkapi

- **Audit Keamanan = "boleh / tidak dipakai"** — gerbang kelayakan. Tanpa ini ditutup, aplikasi **tidak boleh** menangani data penumpang riil.
- **Audit Performa = "enak / tidak dipakai"** — kualitas pengalaman. Membuat aplikasi yang sudah aman jadi cepat & stabil.

> Urutan ideal: tutup blocker keamanan dulu (Bagian 6 di [AUDIT-KEAMANAN.md](AUDIT-KEAMANAN.md)), sambil/baru optimasi performa (Bagian 7 di [AUDIT-PERFORMA.md](AUDIT-PERFORMA.md)). Saat ini performa sudah dikerjakan bertahap (3 ✅); keamanan **belum** disentuh dan tetap prioritas sebelum produksi.

---

## 5. Catatan: Auto-compress Gambar (WebP) — lanjutan P-01

Pada P-01, semua gambar dikonversi ke **WebP** lewat script `sharp` **sekali jalan**. Pertanyaan: kalau menambah gambar baru (`.jpg`/`.jpeg`/`.png`), apakah otomatis ikut di-compress ke WebP?

**Jawaban: TIDAK otomatis.** Gambar baru yang dirender via `<img>` akan diserve apa adanya (ukuran asli). Ada 2 cara membuatnya otomatis:

| Hal | A. `next/image` (set-and-forget) | B. Script `sharp` reusable (semi-manual) |
| --- | --- | --- |
| Cara menambah gambar | Taruh file → render pakai `<Image>` | Taruh file → jalankan `npm run images` |
| Konversi WebP/AVIF | **Otomatis saat diakses** (di-cache Next) | Manual sekali per penambahan |
| Format sumber | Boleh `.png`/`.jpg` apa adanya | Perlu generate `.webp` |
| Perubahan kode | Ganti `<img>` → `<Image>` + butuh `width/height` | Tidak ada (kode tetap `.webp`) |
| File di disk/git | Sumber tetap besar (kiriman ke browser kecil) | File `.webp` kecil ikut tersimpan |
| Cocok untuk | Solusi jangka panjang, "lupakan saja" | Tetap pakai pola `<img>` sekarang |

> Catatan: `images.formats: ["avif","webp"]` yang diset di P-10 **sudah menyiapkan** jalur A — tinggal pindahkan komponen ke `<Image>`.

**Rekomendasi:** untuk benar-benar "tinggal lempar gambar, beres" → pilih **A**. Untuk minim ubah kode → **B** (script disimpan ke repo + `npm run images`). Keduanya belum diterapkan; menunggu keputusan.

---
*Dokumen indeks. Detail temuan & langkah perbaikan ada di masing-masing modul audit yang ditautkan di atas.*
