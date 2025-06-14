const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bakery.db');

// POST /products → Tambah produk baru
router.post('/products', (req, res) => {
  const { name, price, image, description } = req.body;

  if (!name || !price || !image) {
    return res.status(400).json({ error: 'Nama, harga, dan gambar harus diisi' });
  }

  const query = `INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)`;
  db.run(query, [name, price, image, description || ''], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    res.status(201).json({
      message: 'Produk berhasil ditambahkan',
      id: this.lastID
    });
  });
});

// DELETE /products/:id → Hapus produk berdasarkan ID
router.delete('/products/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Produk tidak ditemukan' });
    }

    res.json({ message: 'Produk berhasil dihapus' });
  });
});

module.exports = router;
