# SakuGue

Aplikasi pencatatan keuangan berbasis website yang dirancang khusus untuk mahasiswa agar dapat mengelola keuangan pribadi secara sederhana. Aplikasi ini memungkinkan pengguna untuk membuat akun, mencatat pemasukan dan pengeluaran, serta memantau kondisi keuangan melalui dashboard interaktif. Setiap pengguna memiliki privasi penuh atas datanya sendiri, didukung oleh sistem autentikasi dan manajemen sesi yang aman. Aplikasi ini juga menyimpan preferensi tampilan pengguna untuk memberikan pengalaman yang lebih personal.

## User Story

Sebagai mahasiswa, saya ingin membuat akun dan login dengan aman, sehingga data keuangan pribadi saya tidak bisa diakses oleh orang lain.

Sebagai pengguna, saya ingin melihat ringkasan keuangan di dashboard (nama, saldo, total pemasukan, total pengeluaran, dan transaksi terbaru), sehingga saya mengetahui kondisi keuangan saya saat ini dengan cepat.

Sebagai pengguna, saya ingin menambahkan, mengubah, dan menghapus catatan pemasukan atau pengeluaran, sehingga data transaksi saya selalu akurat dan *up-to-date*.

Sebagai pengguna, saya ingin memfilter riwayat transaksi berdasarkan jenisnya (pemasukan atau pengeluaran), sehingga saya bisa menganalisis arus kas saya dengan lebih mudah.

Sebagai pengguna, saya ingin sesi login saya tetap dipertahankan selama saya aktif, dan aplikasi mengingat preferensi tampilan saya (misalnya tema gelap/terang), sehingga saya tidak perlu login atau mengatur ulang tampilan setiap kali membuka aplikasi.

[Demo](https://sakumahasiswa-demo.example.com/) *(Contoh Tautan)*

## Daftar SRS

| Kode | Deskripsi | Acceptance Criteria |
|------|-----------|---------------------|
| SRS-01 | Manajemen Akun & Autentikasi — Pengguna mendaftar, login, dan logout dengan keamanan sesi. | - Terdapat form registrasi yang meminta Nama Lengkap, Email, dan Password.<br>- Form login memvalidasi Email dan Password, serta menampilkan pesan error jika salah.<br>- Aplikasi menggunakan sistem sesi (*session*) untuk mempertahankan status login pengguna.<br>- Terdapat tombol logout untuk mengakhiri sesi dan mengembalikan pengguna ke halaman login. |
| SRS-02 | Otorisasi & Privasi Data — Membatasi akses agar pengguna hanya bisa mengelola datanya sendiri. | - Terdapat *middleware* pelindung *route* yang mencegah akses ke dashboard jika pengguna belum login.<br>- Setiap operasi *database* pada transaksi difilter berdasarkan ID pengguna yang sedang login (`userId`).<br>- Pengguna A tidak dapat melihat, mengubah, atau menghapus transaksi milik Pengguna B dalam kondisi apa pun. |
| SRS-03 | Manajemen Transaksi (CRUD) & Filter — Membuat, mengedit, menghapus, serta menyaring data transaksi. | - Form transaksi memiliki input untuk jumlah uang, kategori/keterangan, jenis (Pemasukan/Pengeluaran), dan tanggal.<br>- Pengguna dapat mengedit atau menghapus transaksi yang sudah ada.<br>- Terdapat fitur filter di halaman riwayat transaksi untuk menampilkan khusus "Pemasukan" saja atau "Pengeluaran" saja. |
| SRS-04 | Dashboard & Kalkulasi Keuangan — Menampilkan ringkasan informasi keuangan pengguna. | - Halaman dashboard menampilkan sapaan dengan Nama pengguna.<br>- Sistem otomatis mengkalkulasi dan menampilkan total saldo saat ini, total pemasukan, dan total pengeluaran.<br>- Dashboard menampilkan daftar 5-10 transaksi paling baru yang dilakukan pengguna. |
| SRS-05 | Preferensi Pengguna (Cookies) — Menyimpan satu preferensi UI pengguna menggunakan *cookie*. | - Aplikasi memiliki fitur ubah tampilan (misal: *Dark Mode* / *Light Mode* atau format mata uang).<br>- Preferensi ini disimpan menggunakan *cookies* pada browser pengguna.<br>- Saat pengguna me-refresh atau membuka kembali aplikasi, tampilan otomatis menyesuaikan dengan *cookie* yang tersimpan. |

---

## Pembagian Tugas Tim (3 Programmer)
*Tech Stack: Node.js, Express.js, PostgreSQL*

**Programmer 1: Backend Developer (Auth & Core Database)**
*   **Fokus:** Keamanan, Autentikasi, dan Struktur Data.
*   **Tugas:**
    *   Merancang skema database PostgreSQL (Tabel `Users` dan `Transactions` dengan relasi *One-to-Many*).
    *   Membuat API Endpoint untuk Registrasi dan Login menggunakan enkripsi password (misal: *bcrypt*).
    *   Mengonfigurasi *Session* dan *Middleware* untuk membatasi rute (*auth protection*).
    *   Membuat fungsi Logout.
    *   Memastikan dan membuat arsitektur koneksi Node.js ke PostgreSQL.

**Programmer 2: Backend Developer (Transaction Logic & API)**
*   **Fokus:** Logika Bisnis, CRUD Transaksi, dan Kalkulasi Data.
*   **Tugas:**
    *   Membuat API Endpoint CRUD (Create, Read, Update, Delete) untuk transaksi.
    *   Mengimplementasikan logika Otorisasi (memastikan query ke PostgreSQL selalu menyertakan `WHERE user_id = ?`).
    *   Membuat API Endpoint khusus untuk agregasi/kalkulasi Dashboard (menghitung total saldo, total in/out) menggunakan query SQL (`SUM`).
    *   Membuat logika *filtering* transaksi berdasarkan *query parameters* (misal: `?type=income`).
    *   Menangani pengaturan *Cookies* dari sisi server untuk menyimpan preferensi pengguna (misal: tema warna).

**Programmer 3: Frontend Developer (UI/UX & Integration)**
*   **Fokus:** Antarmuka Pengguna dan Integrasi API Backend.
*   **Tugas:**
    *   Membangun halaman Login dan Registrasi beserta validasi form dari sisi *client*.
    *   Membangun layout Dashboard interaktif yang menampilkan nama, kartu saldo, dan daftar transaksi terbaru.
    *   Membangun halaman Manajemen Transaksi (Tabel riwayat, tombol filter, form modal untuk tambah/edit data).
    *   Melakukan integrasi/konsumsi REST API (Fetch/Axios) yang dibuat oleh Programmer 1 & 2.
    *   Menerapkan pembacaan *Cookies* di sisi frontend untuk mengubah UI (misal: melakukan *toggle* CSS class untuk *Dark Mode* berdasarkan cookie).
