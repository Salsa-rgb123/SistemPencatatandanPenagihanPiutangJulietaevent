# Julieta Suite — by Julieta Event & Décor

Julieta Suite adalah aplikasi manajemen event dan keuangan Julieta Event & Décor. Admin utama: **Salsabila Dwi Putri**. Aplikasi menggunakan tema soft lilac/lavender, judul serif klasik, antarmuka Inter, dan ukuran teks untuk keterbacaan desktop maupun ponsel.

## Demo Aplikasi

Demo: https://link-demo-aplikasi-anda.com

## Fitur Utama

- Manajemen data klien
- Pendaftaran event dengan kartu pilihan Event Organizer, Decoration, MUA, Wardrobe, Catering, Photobooth, MC, dan Sanggar
- Kalkulasi harga layanan dan biaya lokasi otomatis (Zona 1–4)
- Pembuatan invoice dan piutang
- Smart deposit tagihan, jaminan properti, catatan potongan kerusakan, serta perhitungan refund dan rekening klien
- Nomor WhatsApp klien dan pengingat pembayaran melalui WhatsApp
- Login admin Supabase Auth dengan pembatasan API dan database
- Dashboard ringkasan untuk monitoring status keuangan dan event
- Update status secara dinamis melalui antarmuka aplikasi

## Persiapan database dan admin

1. Jalankan seluruh [backend/supabase.sql](./backend/supabase.sql) di SQL Editor project Supabase. Skrip ini menambahkan data jasa/zona, durasi event, tabel jaminan, dan kebijakan akses admin. Jika versi sebelumnya sudah pernah dijalankan, jalankan kembali skrip terbaru satu kali agar kolom durasi, tarif zona, dan kalkulasi total database ikut diperbarui. Data kontrak event lama tidak diubah massal.
2. Di Supabase Authentication, nonaktifkan pendaftaran publik dan buat satu akun admin dengan email serta password yang kuat.
3. Berikan role admin hanya ke akun tersebut melalui SQL Editor Supabase (ganti email dengan alamat admin):

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'admin@julieta.com';
   ```

   Query harus mengubah satu akun. Jika tidak ada baris yang berubah, pastikan akun admin sudah dibuat dan alamat email benar.
4. Deploy ulang fungsi Supabase `julieta-api` menggunakan [backend/app.js](./backend/app.js). API meneruskan access token login ke Supabase; secret `service_role` tidak digunakan di browser.
5. Layani folder `frontend/` melalui hosting web/localhost (bukan membuka file HTML langsung) dan buka aplikasinya. Login memakai email/password akun admin Supabase.

Kebijakan database membatasi operasi ke JWT dengan `app_metadata.role = 'admin'`. Jangan berikan metadata role ini kepada akun lain. Pastikan Signup dinonaktifkan atau akun tanpa role admin tetap tidak dapat membaca data.

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
5. Pada Piutang dan Smart deposit, tombol WhatsApp memakai template tagihan yang sama: sapaan sesuai waktu, nama klien, venue, tanggal dan durasi event, nomor invoice, nilai kontrak, pembayaran masuk, sisa piutang, serta rekening pembayaran. Pesan deposit menambahkan rincian termin dan jatuh tempo; konfirmasi pembayaran menambahkan nominal termin yang diterima. Periksa dan perbarui informasi rekening pada `whatsappBillingMessage` di `frontend/script.js` sebelum mengirim pesan kepada klien. Konfirmasi refund memakai template tersendiri. Admin tetap meninjau pesan lalu menekan Kirim di WhatsApp.
6. Catat jaminan terpisah dari termin invoice. Setelah acara, masukkan nominal potongan dan alasan kerusakan; sistem menampilkan sisa refund dan tidak memprosesnya sebelum nomor rekening klien diisi. Tandai refund setelah transfer benar-benar dilakukan, lalu kirim konfirmasi WhatsApp.

Tombol WhatsApp menggunakan tautan `wa.me` dan **tidak mengirim pesan otomatis**. Pengiriman tanpa tindakan admin memerlukan WhatsApp Business Cloud API, template yang disetujui Meta, serta konfigurasi server tambahan.

## Teknologi

- Frontend: HTML, CSS, JavaScript
- Backend: Deno + Supabase REST API
- Database: Supabase

## Struktur Project

- `backend/` - API backend dan koneksi ke Supabase
- `frontend/` - antarmuka pengguna aplikasi

## Cara Menjalankan

1. Pastikan environment dan koneksi Supabase sudah aktif.
2. Jalankan backend di folder `backend/`.
3. Buka folder `frontend/` dan akses aplikasi melalui browser.
4. Pastikan API key dan konfigurasi database sudah sesuai.

## Catatan

Perubahan SQL memperbarui hak akses yang sebelumnya mengizinkan akses publik. Data finansial baru hanya dapat dikelola setelah akun admin dengan role yang benar dibuat.
