const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Konfigurasi Multer dengan Memory Storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Hanya terima file Excel
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.originalname.endsWith('.xlsx')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file Excel (.xlsx) yang diizinkan!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // Maksimal 5MB
    }
});

// ========================
// API ENDPOINTS
// ========================

// GET /api/uploads - Mengambil history upload
app.get('/api/uploads', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM uploads ORDER BY created_at DESC');
        res.json({
            success: true,
            message: 'History upload berhasil diambil',
            data: rows
        });
    } catch (error) {
        console.error('Error fetching uploads:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil history upload',
            error: error.message
        });
    }
});

// GET /api/products - Mengambil semua data produk (support filtering by upload_id)
app.get('/api/products', async (req, res) => {
    try {
        const { upload_id } = req.query;
        let query = 'SELECT * FROM products';
        let params = [];

        if (upload_id) {
            query += ' WHERE upload_id = ?';
            params.push(upload_id);
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await pool.query(query, params);
        res.json({
            success: true,
            message: 'Data produk berhasil diambil',
            data: rows
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data produk',
            error: error.message
        });
    }
});

// POST /api/products - Menambah satu data produk manual
app.post('/api/products', async (req, res) => {
    try {
        const { product_code, product_name, category, price, stock } = req.body;

        // Validasi input
        if (!product_code || !product_name) {
            return res.status(400).json({
                success: false,
                message: 'product_code dan product_name wajib diisi'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO products (product_code, product_name, category, price, stock) 
             VALUES (?, ?, ?, ?, ?)`,
            [product_code, product_name, category || null, price || 0, stock || 0]
        );

        res.status(201).json({
            success: true,
            message: 'Produk berhasil ditambahkan',
            data: {
                id: result.insertId,
                product_code,
                product_name,
                category,
                price: price || 0,
                stock: stock || 0
            }
        });
    } catch (error) {
        console.error('Error creating product:', error);
        
        // Handle duplicate entry error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: `Product code '${req.body.product_code}' sudah ada dalam database`
            });
        }

        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan produk',
            error: error.message
        });
    }
});

// PUT /api/products/:id - Mengupdate data produk
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { product_code, product_name, category, price, stock } = req.body;

        // Cek apakah produk ada
        const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Produk dengan ID ${id} tidak ditemukan`
            });
        }

        // Build dynamic update query
        const updates = [];
        const values = [];

        if (product_code !== undefined) {
            updates.push('product_code = ?');
            values.push(product_code);
        }
        if (product_name !== undefined) {
            updates.push('product_name = ?');
            values.push(product_name);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            values.push(category);
        }
        if (price !== undefined) {
            updates.push('price = ?');
            values.push(price);
        }
        if (stock !== undefined) {
            updates.push('stock = ?');
            values.push(stock);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada data yang diupdate'
            });
        }

        values.push(id);
        const query = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
        
        await pool.query(query, values);

        // Ambil data terbaru
        const [updated] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Produk berhasil diupdate',
            data: updated[0]
        });
    } catch (error) {
        console.error('Error updating product:', error);

        // Handle duplicate entry error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: `Product code '${req.body.product_code}' sudah digunakan produk lain`
            });
        }

        res.status(500).json({
            success: false,
            message: 'Gagal mengupdate produk',
            error: error.message
        });
    }
});

// DELETE /api/products/:id - Menghapus data produk
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Cek apakah produk ada
        const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Produk dengan ID ${id} tidak ditemukan`
            });
        }

        await pool.query('DELETE FROM products WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Produk berhasil dihapus',
            data: existing[0]
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus produk',
            error: error.message
        });
    }
});

// POST /api/upload - Upload file Excel dengan Transaction (All or Nothing)
app.post('/api/upload', upload.single('file'), async (req, res) => {
    // Dapatkan koneksi untuk transaction
    const connection = await pool.getConnection();

    try {
        // Validasi file
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'File tidak ditemukan. Pastikan field name adalah "file"'
            });
        }

        // Baca file Excel dari buffer
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Konversi ke JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'File Excel kosong atau tidak memiliki data'
            });
        }

        // Validasi header/kolom yang diperlukan
        const requiredColumns = ['Code', 'Name', 'Category', 'Price', 'Stock'];
        const firstRow = jsonData[0];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));

        if (missingColumns.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Kolom yang diperlukan tidak ditemukan: ${missingColumns.join(', ')}`,
                expected: requiredColumns
            });
        }

        // Validasi dan mapping data
        const products = [];
        const errors = [];

        jsonData.forEach((row, index) => {
            const rowNumber = index + 2; // +2 karena Excel mulai dari baris 1 (header) + 1

            // Validasi data per baris
            if (!row.Code || String(row.Code).trim() === '') {
                errors.push(`Baris ${rowNumber}: Code tidak boleh kosong`);
            }
            if (!row.Name || String(row.Name).trim() === '') {
                errors.push(`Baris ${rowNumber}: Name tidak boleh kosong`);
            }
            if (row.Price !== undefined && isNaN(Number(row.Price))) {
                errors.push(`Baris ${rowNumber}: Price harus berupa angka`);
            }
            if (row.Stock !== undefined && isNaN(Number(row.Stock))) {
                errors.push(`Baris ${rowNumber}: Stock harus berupa angka`);
            }

            products.push({
                product_code: String(row.Code).trim(),
                product_name: String(row.Name).trim(),
                category: row.Category ? String(row.Category).trim() : null,
                price: Number(row.Price) || 0,
                stock: Number(row.Stock) || 0
            });
        });

        // Jika ada error validasi, kembalikan semua error
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validasi gagal. Tidak ada data yang disimpan.',
                errors: errors
            });
        }

        // ========================
        // TRANSACTION: All or Nothing
        // ========================
        await connection.beginTransaction();

        try {
            // 1. Simpan record ke tabel uploads
            const [uploadResult] = await connection.query(
                `INSERT INTO uploads (filename, total_rows) VALUES (?, ?)`,
                [req.file.originalname, jsonData.length]
            );
            const uploadId = uploadResult.insertId;

            let insertedCount = 0;

            // 2. Simpan produk dengan upload_id
            for (let i = 0; i < products.length; i++) {
                const product = products[i];
                
                await connection.query(
                    `INSERT INTO products (product_code, product_name, category, price, stock, upload_id) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [product.product_code, product.product_name, product.category, product.price, product.stock, uploadId]
                );
                insertedCount++;
            }

            // Jika semua berhasil, COMMIT
            await connection.commit();

            res.status(201).json({
                success: true,
                message: `Berhasil mengupload ${insertedCount} produk dari file Excel`,
                data: {
                    filename: req.file.originalname,
                    totalRows: jsonData.length,
                    insertedRows: insertedCount
                }
            });

        } catch (insertError) {
            // Jika ada error saat insert, ROLLBACK semua
            await connection.rollback();

            console.error('Transaction rollback:', insertError);

            // Handle duplicate entry error
            if (insertError.code === 'ER_DUP_ENTRY') {
                // Extract product_code from error message
                const match = insertError.message.match(/Duplicate entry '(.+?)'/);
                const duplicateValue = match ? match[1] : 'unknown';

                return res.status(409).json({
                    success: false,
                    message: `Upload dibatalkan (ROLLBACK). Product code '${duplicateValue}' sudah ada dalam database.`,
                    error: 'Tidak ada data yang disimpan karena terdapat duplikat.'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Upload dibatalkan (ROLLBACK). Terjadi error saat menyimpan data.',
                error: insertError.message
            });
        }

    } catch (error) {
        // Rollback jika ada error di luar transaction
        await connection.rollback();
        
        console.error('Error uploading file:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memproses file Excel',
            error: error.message
        });
    } finally {
        // Selalu release connection
        connection.release();
    }
});

// Error handler untuk Multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Ukuran file terlalu besar. Maksimal 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    
    next();
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'REST API Manajemen Produk',
        endpoints: {
            'GET /api/products': 'Ambil semua produk',
            'POST /api/products': 'Tambah produk baru',
            'PUT /api/products/:id': 'Update produk',
            'DELETE /api/products/:id': 'Hapus produk',
            'POST /api/upload': 'Upload file Excel (.xlsx)'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📋 API Endpoints:`);
    console.log(`   GET    /api/products     - Ambil semua produk`);
    console.log(`   POST   /api/products     - Tambah produk baru`);
    console.log(`   PUT    /api/products/:id - Update produk`);
    console.log(`   DELETE /api/products/:id - Hapus produk`);
    console.log(`   POST   /api/upload       - Upload file Excel`);
});

module.exports = app;
