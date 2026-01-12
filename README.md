# Demo Managemen Data - REST API

REST API sederhana untuk manajemen data produk menggunakan Node.js (Express) dan MySQL.

## Tech Stack

- **Framework**: Express.js
- **Database**: MySQL (mysql2/promise)
- **Excel Parsing**: xlsx (SheetJS)
- **File Upload**: multer (memory storage)
- **Middleware**: cors, body-parser

## Setup

### 1. Backend Setup

#### a. Install Dependencies
```bash
npm install
```

#### b. Konfigurasi Database
1. Buat database baru di MySQL (misal: `demo_db`).
2. Copy file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` dan sesuaikan dengan user/pass database Anda.

#### c. Inisialisasi Database
Jalankan script migrasi untuk membuat tabel yang diperlukan (`uploads` dan `products`):

> **Catatan:** Pastikan Anda sudah membuat database kosong terlebih dahulu.

Jika belum ada tabel sama sekali, jalankan query ini dulu di SQL Tools (phpMyAdmin/DBeaver) untuk tabel dasar:
```sql
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Kemudian jalankan script migrasi untuk update schema terbaru:
```bash
node scripts/migrate.js
```

#### d. Jalankan Server Backend
```bash
npm start
```
Server berjalan di `http://localhost:3000`

---

### 2. Frontend Setup

Masuk ke folder frontend:
```bash
cd frontend
```

#### a. Install Dependencies
```bash
npm install
```

#### b. Jalankan Vite Dev Server
```bash
npm run dev
```
Akses aplikasi di browser (biasanya `http://localhost:5173`).

---

## API Endpoints

| Method | Endpoint | Deskripsi | Params/Body |
|--------|----------|-----------|-------------|
| GET | `/api/products` | Ambil semua produk | `?upload_id={id}` (Wajib jika ingin data dari file spesifik) |
| POST | `/api/products` | Tambah produk baru | `{..., upload_id: id}` |
| PUT | `/api/products/:id` | Update produk | `{..., upload_id: id}` |
| DELETE | `/api/products/:id` | Hapus produk | `?upload_id={id}` |
| POST | `/api/upload` | Upload file Excel | `FormData: file` |
| PUT | `/api/uploads/:id` | Update nama Upload | `filename` |
| DELETE | `/api/uploads/:id` | Hapus Upload & Tabel | - |
| GET | `/api/uploads` | History upload | - |

## Fitur dan Arsitektur Baru

### 1. Dynamic Tables untuk Upload Excel
Setiap kali user mengupload file Excel baru, sistem akan:
1.  Membuat tabel database baru secara dinamis (contoh: `products_upload_1`, `products_upload_2`).
2.  Menyimpan metadata upload (nama file, nama tabel) ke tabel `uploads`.
3.  Memasukkan data prodyuk dari Excel ke tabel baru tersebut.
4.  Fitur ini memungkinkan isolasi data antar file upload, sehingga menghapus satu upload tidak mengganggu data upload lain.

### 2. Validasi Transaction (Atomic)
Proses upload menggunakan Database Transaction yang ketat:
-   **All or Nothing**: Jika ada satu saja baris yang gagal (misal duplikat kode), maka **seluruh** proses dibatalkan.
-   Tabel dinamis yang baru dibuat akan otomatis dihapus jika insert data gagal.

### 3. Manajemen Upload (Rename & Delete)
-   **Rename**: User dapat mengubah nama history upload langsung dari dashboard. Perubahan ini akan mengupdate nama yang tampil di sidebar dan header.
-   **Delete**: User dapat menghapus history upload tertentu. Tindakan ini akan:
    1.  Menghapus record dari tabel `uploads`.
    2.  Secara otomatis men-drop (menghapus) tabel dinamis terkait (misal `products_upload_5`) dari database untuk membersihkan penyimpanan.

## Struktur Database

### Tabel `uploads`
Menyimpan daftar file yang pernah diupload.
-   `id`: Primary Key
-   `filename`: Nama file asli
-   `table_name`: Nama tabel dinamis yang menyimpan isinya (misal: `products_upload_5`)
-   `total_rows`: Jumlah baris data
-   `created_at`: Waktu upload

### Tabel `products` (dan tabel dinamis `products_upload_X`)
Struktur tabel produk standar dan tabel dinamis adalah sama:
-   `id`: Primary Key
-   `product_code`: Unique Code
-   `product_name`: Nama Produk
-   `category`: Kategori
-   `price`: Harga
-   `stock`: Stok


