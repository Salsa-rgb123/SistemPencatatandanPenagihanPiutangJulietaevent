# Julieta Suite — by Julieta Event & Décor

Julieta Suite adalah aplikasi manajemen event dan keuangan Julieta Event & Décor. Admin utama: **Salsabila Dwi Putri**. Aplikasi menggunakan tema soft lilac/lavender, judul serif klasik, antarmuka Inter, dan ukuran teks untuk keterbacaan desktop maupun ponsel.

## Fitur Utama

- Manajemen data klien
- Pendaftaran event dengan kartu pilihan Event Organizer, Decoration, MUA, Wardrobe, Catering, Photobooth, MC, dan Sanggar
- Kalkulasi harga layanan dan biaya lokasi otomatis (Zona 1–4)
- Pembuatan invoice dan piutang
- Smart deposit tagihan dengan penanda jatuh tempo, jaminan properti, inventaris kerusakan, kalkulasi potongan otomatis, dan perhitungan refund
- Invoice serta struk bukti pembayaran per termin dalam PDF; struk pembayaran dapat diunduh atau dibagikan lewat menu berbagi perangkat
- Nomor WhatsApp klien dan pengingat pembayaran melalui WhatsApp
- Dashboard langsung terbuka dengan akses tanpa login
- Validasi data wajib dengan notifikasi merah; formulir tidak dapat dilanjutkan jika data belum lengkap
- Dashboard ringkasan dengan grafik bulanan piutang, pembayaran, dan kerusakan barang
- Update status secara dinamis melalui antarmuka aplikasi

## Persiapan Supabase dan mengisi data

1. Buka project Supabase yang benar. Aplikasi saat ini memakai project ref `gvxysxktqexuhrfkikjv` (`https://gvxysxktqexuhrfkikjv.supabase.co`).
2. Di **SQL Editor**, pilih **New query**, salin **seluruh isi** [backend/supabase.sql](./backend/supabase.sql), lalu tekan **Run**. SQL menyiapkan/memperbarui skema, memastikan kolom `paid_at` tersedia sebelum dipakai, dan mengaktifkan akses baca/tulis publik. SQL tidak menghapus data yang sudah ada.
3. Layani folder `frontend/` lewat localhost/hosting web (jangan membuka `index.html` sebagai file langsung), lalu muat ulang aplikasi. Tidak perlu deploy Edge Function. Jika kelima tabel aplikasi masih kosong dan belum pernah dipakai, dashboard menginisialisasi tiga transaksi contoh Vanesha (lunas/refund), Bintang (pembayaran sebagian), dan Nadira (termin terlambat) sekali saja. Begitu ada data atau perubahan manual, seed tidak akan dijalankan kembali, termasuk setelah data dihapus.
4. Isi data lewat menu aplikasi. Mulai dari **Klien**, lalu buat **Event**, **Piutang/Invoice**, termin di **Smart Deposit**, dan jaminan jika diperlukan.

**Peringatan:** akses publik sengaja dibuka untuk kebutuhan tugas. Siapa pun yang mengetahui alamat aplikasi/API dapat membaca, menambah, mengubah, dan menghapus data. Jangan gunakan konfigurasi ini untuk data pribadi atau sensitif.

## Alur transaksi

1. Tambahkan klien, termasuk nomor WhatsApp dalam format `+62 812 3456 7890` dan rekening bank untuk refund.
2. Buat event, tentukan durasi 1–3 hari, lalu pilih satu atau beberapa kartu jasa. Masing-masing kartu menampilkan harga dasar per hari dan harga otomatis terisi saat dipilih; tarif masih dapat disesuaikan untuk kebutuhan event:
   - Event Organizer (EO): Rp45.000.000 per hari
   - Decoration: Rp120.000.000 per hari
   - MUA: Rp25.000.000 per hari
   - Wardrobe: Rp35.000.000 per hari
   - Catering: Rp75.000.000 per hari
   - Photobooth: Rp15.000.000 per hari
   - MC: Rp12.500.000 per hari
   - Sanggar Tradisional: Rp18.000.000 per hari
3. Pilih zona lokasi:
   - Zona 1 — Semarang & sekitarnya: Rp0
   - Zona 2 — Jawa Tengah & Jogja: Rp5.000.000
   - Zona 3 — Jakarta/Bali: Rp25.000.000
   - Zona 4 — ASEAN/Internasional: Rp75.000.000
4. Total kontrak dihitung langsung dengan rumus **(jumlah harga jasa terpilih per hari × jumlah hari) + biaya zona**. Durasi dan total kontrak disimpan pada event, dan database menghitung ulang total tersebut untuk memastikan nilainya benar. Buat invoice dari modul Piutang.
5. Pada Piutang dan Smart deposit, tombol WhatsApp memakai template tagihan yang sama: sapaan sesuai waktu, nama klien, venue, tanggal dan durasi event, nomor invoice, nilai kontrak, pembayaran masuk, sisa piutang, serta rekening pembayaran. Termin yang jatuh tempo dalam 7 hari dan termin terlambat diberi penanda. Periksa dan perbarui informasi rekening pada `whatsappBillingMessage` di `frontend/script.js` sebelum mengirim pesan kepada klien.
6. Saat admin mengonfirmasi pembayaran termin di Smart Deposit, sistem langsung membuka pratinjau **Struk Bukti Pembayaran**. Dari sana, pilih **Cetak Struk** untuk membuka PDF dengan dialog cetak, **Download Struk PDF** untuk menyimpan, atau **Kirim ke Klien** untuk membuka menu berbagi perangkat/WhatsApp. Untuk termin yang telah dibayar, struk juga tersedia dari aksi pada daftar Smart Deposit. Jika browser tidak mendukung berbagi file, PDF diunduh dan chat WhatsApp dibuka agar file dapat dilampirkan manual. Invoice PDF dari daftar Piutang menggunakan layout pembayaran dengan logo SVG yang sama seperti di sistem, informasi klien/event dan transaksi, rincian termin serta jaminan yang terpisah, dan ringkasan total penerimaan/piutang.
7. Catat jaminan terpisah dari termin invoice. Saat memproses refund, centang inventaris rusak dan masukkan jumlah unit/meternya. Subtotal denda setiap barang serta total potongan langsung dihitung dari tarif katalog; sisa refund ditampilkan dari saldo awal. Lengkapi rekening klien, lalu tandai refund setelah transfer benar-benar dilakukan.

Berbagi PDF tetap memerlukan tindakan admin untuk memilih penerima dan mengirim file. Dukungan berbagi file bergantung pada browser/perangkat; pengiriman otomatis tanpa tindakan admin memerlukan WhatsApp Business Cloud API, template yang disetujui Meta, penyimpanan file, serta konfigurasi server tambahan. Tanda tangan dan stempel di struk merupakan penanda visual, bukan tanda tangan elektronik tersertifikasi.

## Teknologi

- Frontend: HTML, CSS, JavaScript
- Backend: Deno + Supabase REST API
- Database: Supabase

## Struktur Project

- `backend/` - API backend dan koneksi ke Supabase
- `frontend/` - antarmuka pengguna aplikasi

## Cara Menjalankan

1. Pastikan skrip Supabase di atas sudah berhasil dijalankan pada project yang dipakai aplikasi.
2. Jalankan folder `frontend/` melalui server lokal atau hosting web.
3. Buka aplikasi di browser; frontend mengakses REST API Supabase secara langsung.

## Catatan

Frontend terhubung langsung ke Supabase REST API. Perubahan skema dan fungsi inisialisasi dilakukan melalui [backend/supabase.sql](./backend/supabase.sql); jalankan SQL tersebut sebelum membuka aplikasi.
