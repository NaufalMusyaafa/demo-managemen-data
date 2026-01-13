const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('./config/db');
const path = require('path');
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

// PUT /api/uploads/:id - Update nama file upload
app.put('/api/uploads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { filename } = req.body;

        if (!filename || filename.trim() === '') {
             return res.status(400).json({
                success: false,
                message: 'Filename tidak boleh kosong'
            });
        }

        const [result] = await pool.query('UPDATE uploads SET filename = ? WHERE id = ?', [filename, id]);

        if (result.affectedRows === 0) {
             return res.status(404).json({
                success: false,
                message: 'Upload tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Filename berhasil diupdate'
        });
    } catch (error) {
        console.error('Error updating upload filename:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupdate filename',
            error: error.message
        });
    }
});

// DELETE /api/uploads/:id - Hapus history upload dan tabel terkait
app.delete('/api/uploads/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;

        // 1. Get info upload untuk dapat nama tabel
        const [upload] = await connection.query('SELECT table_name FROM uploads WHERE id = ?', [id]);
        
        if (upload.length === 0) {
             return res.status(404).json({
                success: false,
                message: 'Upload tidak ditemukan'
            });
        }

        const tableName = upload[0].table_name;

        // 2. Drop table dinamis
        if (tableName) {
            await connection.query(`DROP TABLE IF EXISTS ${tableName}`);
        }

        // 3. Hapus dari tabel uploads
        await connection.query('DELETE FROM uploads WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Data upload dan tabel berhasil dihapus'
        });

    } catch (error) {
        console.error('Error deleting upload:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus upload',
            error: error.message
        });
    } finally {
        connection.release();
    }
});

// GET /api/products - Mengambil semua data produk (support filtering by upload_id)
app.get('/api/products', async (req, res) => {
    try {
        const { upload_id } = req.query;
        let query = 'SELECT * FROM products';
        let params = [];
        let targetTable = 'products';

        if (upload_id) {
            // Get table name for this upload
            const [upload] = await pool.query('SELECT table_name FROM uploads WHERE id = ?', [upload_id]);
            if (upload.length > 0 && upload[0].table_name) {
                targetTable = upload[0].table_name;
                query = `SELECT * FROM ${targetTable}`; // Using template literal for table name (internal trusted source)
            } else {
                 return res.json({
                    success: true,
                    message: 'Upload not found or no table associated',
                    data: []
                });
            }
        }

        query += ' ORDER BY id DESC'; // Assuming id exists in dynamic tables too

        const [rows] = await pool.query(query, params);
        // Add upload_id to each row if it doesn't have it (dynamic tables might not store it per row if table IS the group)
        // But for frontend consistency, let's keep it clean.
        
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
        const { product_code, product_name, category, price, stock, upload_id } = req.body;

        // Validasi input
        if (!product_code || !product_name) {
            return res.status(400).json({
                success: false,
                message: 'product_code dan product_name wajib diisi'
            });
        }

        let targetTable = 'products';
        if (upload_id) {
             const [upload] = await pool.query('SELECT table_name FROM uploads WHERE id = ?', [upload_id]);
             if (upload.length > 0 && upload[0].table_name) {
                 targetTable = upload[0].table_name;
             }
        }

        const [result] = await pool.query(
            `INSERT INTO ${targetTable} (product_code, product_name, category, price, stock) 
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
        const { product_code, product_name, category, price, stock, upload_id } = req.body;

        let targetTable = 'products';
        if (upload_id) {
             const [upload] = await pool.query('SELECT table_name FROM uploads WHERE id = ?', [upload_id]);
             if (upload.length > 0 && upload[0].table_name) {
                 targetTable = upload[0].table_name;
             }
        }

        // Cek apakah produk ada
        const [existing] = await pool.query(`SELECT * FROM ${targetTable} WHERE id = ?`, [id]);
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
        const query = `UPDATE ${targetTable} SET ${updates.join(', ')} WHERE id = ?`;
        
        await pool.query(query, values);

        // Ambil data terbaru
        const [updated] = await pool.query(`SELECT * FROM ${targetTable} WHERE id = ?`, [id]);

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
        const { upload_id } = req.query; // Expect upload_id in query for delete

        let targetTable = 'products';
        if (upload_id) {
             const [upload] = await pool.query('SELECT table_name FROM uploads WHERE id = ?', [upload_id]);
             if (upload.length > 0 && upload[0].table_name) {
                 targetTable = upload[0].table_name;
             }
        }

        // Cek apakah produk ada
        const [existing] = await pool.query(`SELECT * FROM ${targetTable} WHERE id = ?`, [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Produk dengan ID ${id} tidak ditemukan`
            });
        }

        await pool.query(`DELETE FROM ${targetTable} WHERE id = ?`, [id]);

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

    let newTableName = '';
    let uploadId = null;

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
        // Note on MySQL DDL and transactions: CREATE TABLE causes an implicit commit.
        // To ensure "all or nothing", we'll insert into `uploads` first, then create the table,
        // then begin a transaction for the bulk inserts. If bulk inserts fail, we'll manually
        // drop the table and delete the `uploads` record.

        // 1. Simpan record ke tabel uploads (this will be committed immediately)
        // Gunakan nama file tanpa ekstensi untuk judul tabel
        const filenameWithoutExt = path.parse(req.file.originalname).name;
        
        const [uploadResult] = await connection.query(
            `INSERT INTO uploads (filename, total_rows) VALUES (?, ?)`,
            [filenameWithoutExt, jsonData.length]
        );
        uploadId = uploadResult.insertId;
        newTableName = `products_upload_${uploadId}`;

        // 2. Create Dynamic Table (this will also be committed immediately)
        await connection.query(
            `CREATE TABLE ${newTableName} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_code VARCHAR(255) NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                category VARCHAR(255),
                price DECIMAL(10, 2) DEFAULT 0,
                stock INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_product_code (product_code)
            )`
        );

        // 3. Update uploads table with table_name (this will be committed immediately)
        await connection.query(
            `UPDATE uploads SET table_name = ? WHERE id = ?`,
            [newTableName, uploadId]
        );

        // Now, begin a transaction for the actual data inserts
        await connection.beginTransaction();

        let insertedCount = 0;

        try {
            // 4. Simpan produk ke tabel dinamis baru
            for (let i = 0; i < products.length; i++) {
                const product = products[i];
                
                await connection.query(
                    `INSERT INTO ${newTableName} (product_code, product_name, category, price, stock) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [product.product_code, product.product_name, product.category, product.price, product.stock]
                );
                insertedCount++;
            }

            // Jika semua berhasil, COMMIT
            await connection.commit();

            res.status(201).json({
                success: true,
                message: `Berhasil mengupload ${insertedCount} produk. Disimpan di tabel baru: ${newTableName}`,
                data: {
                    filename: req.file.originalname,
                    totalRows: jsonData.length,
                    insertedRows: insertedCount,
                    uploadId: uploadId
                }
            });

        } catch (insertError) {
            // If there's an error during data insertion, ROLLBACK the inserts
            await connection.rollback();

            console.error('Transaction rollback (data insertion failed):', insertError);

            // Cleanup: Drop the created table and delete the upload record
            try {
                if (newTableName) {
                    await connection.query(`DROP TABLE IF EXISTS ${newTableName}`);
                }
                if (uploadId) {
                    await connection.query(`DELETE FROM uploads WHERE id = ?`, [uploadId]);
                }
            } catch (cleanupError) {
                console.error('Cleanup failed after data insertion error:', cleanupError);
            }

            // Handle duplicate entry error
            if (insertError.code === 'ER_DUP_ENTRY') {
                const match = insertError.message.match(/Duplicate entry '(.+?)'/);
                const duplicateValue = match ? match[1] : 'unknown';

                return res.status(409).json({
                    success: false,
                    message: `Upload dibatalkan. Product code '${duplicateValue}' duplikat.`,
                    error: 'Tidak ada data yang disimpan.'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Upload dibatalkan. Terjadi error saat menyimpan data.',
                error: insertError.message
            });
        }

    } catch (error) {
        // This catch block handles errors before or during DDL operations (e.g., file read, validation, CREATE TABLE)
        console.error('Error uploading file or creating table:', error);

        // Attempt cleanup if table was created but something else failed
        try {
            if (newTableName) {
                await connection.query(`DROP TABLE IF EXISTS ${newTableName}`);
            }
            if (uploadId) {
                await connection.query(`DELETE FROM uploads WHERE id = ?`, [uploadId]);
            }
        } catch (cleanupError) {
            console.error('Cleanup failed after initial upload/table creation error:', cleanupError);
        }
        
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
