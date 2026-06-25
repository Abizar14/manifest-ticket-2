# Foto Avatar Petugas

Halaman **Kelola Petugas** (`/admin/officers`) menampilkan avatar foto bundar.
Foto diambil dari folder ini. Bila sebuah foto gagal dimuat, otomatis fallback
ke inisial nama (layout tetap rapi).

## Mapping aktif (lihat `AVATAR_BY_EMAIL` di page.tsx)

| Petugas (email)       | File foto      |
| --------------------- | -------------- |
| Andi (`avsec1`)       | `petugas1.png` |
| Budi (`avsec2`)       | `petugas3.png` |
| Citra (`avsec3`)      | `petugas2.png` |
| Dewi (`avsec4`)       | `petugas4.png` |
| Eko (`avsec5`)        | `petugas5.png` |
| Admin (`admin`)       | `petugas1.png` |
| Operator (`operator`) | `petugas5.png` |

Email lain (petugas baru) otomatis dipetakan deterministik ke salah satu
`petugas1..5.png`. Untuk mengganti/menambah pemetaan, edit `AVATAR_BY_EMAIL`
di `src/app/admin/officers/page.tsx`.

## Spesifikasi foto (agar semua avatar seragam)

Avatar dirender pada tinggi tetap 120px, di-anchor ke bawah, lalu lingkaran
80px membingkai badan & kepala menyembul di atas. Karena itu **framing tiap
foto harus konsisten**, bukan sekadar ukuran px.

| Aspek          | Ketentuan                                                  |
| -------------- | ---------------------------------------------------------- |
| Format         | **PNG, background transparan** (wajib untuk pop-out)       |
| Aspect ratio   | **1:1 (persegi)** — samakan semua                          |
| Ukuran         | **600×600 px** (min 400×400; file < ~500 KB)               |
| Isi            | Setengah badan: kepala + bahu, menghadap depan             |
| Puncak kepala  | ~10% dari tepi atas kanvas                                 |
| Bahu/dada      | menyentuh tepi bawah kanvas (di-anchor ke bawah)           |
| Horizontal     | wajah center (tengah)                                      |
| Tinggi kepala  | ~45–55% tinggi kanvas (biar kepala seragam)                |
| Lebar bahu     | ~70–75% lebar kanvas (biar bahu tak nyembul keluar cincin) |

Hindari: foto miring, zoom beda-beda, ada objek/orang lain, background belum
dihapus. Bila sebuah foto gagal/format salah → otomatis fallback ke inisial
nama (layout tetap aman).

## Ilustrasi hero (opsional)

`hero-security.png` — gambar 3D security di header. Bila tidak ada, dipakai
emblem CSS/icon bawaan.
