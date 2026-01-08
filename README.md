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

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/products` | Ambil semua produk |
| POST | `/api/products` | Tambah produk baru |
| PUT | `/api/products/:id` | Update produk |
| DELETE | `/api/products/:id` | Hapus produk |
| POST | `/api/upload` | Upload file Excel |
| GET | `/api/uploads` | History upload |

## Fitur

- CRUD Produk
- Upload Excel dengan Validasi Transaction (Atomic)
- History Upload
- Frontend Table dengan AG Grid

