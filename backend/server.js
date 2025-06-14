const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./bakery.db');
const SECRET = 'maison-secret';

app.use(cors());
app.use(bodyParser.json());

// Static files
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use(express.static(path.join(__dirname, 'frontend')));

// ------------------ INIT DATABASE ------------------
const initDB = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price INTEGER,
      image TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      product_id INTEGER,
      quantity INTEGER DEFAULT 1
    )`);

    db.all(`SELECT * FROM products`, (err, rows) => {
      if (err) {
        console.error('❌ Gagal ambil data produk:', err.message);
        return;
      }
      if (!rows || rows.length === 0) {
        const sampleProducts = [
          ['Croissant', 15000, 'croissant.jpg'],
          ['Macaron Box', 80000, 'macaron.jpg'],
          ['Lemon Tart', 30000, 'tart.jpg'],
          ['Cheesecake Berry', 45000, 'cheesecake berry.jpg'],
          ['Cupcake Cokelat', 20000, 'cupcake cokelat.jpg'],
          ['Roti Sourdough', 60000, 'roti sourdough.jpg']
        ];
        sampleProducts.forEach(p => {
          db.run(`INSERT INTO products (name, price, image) VALUES (?, ?, ?)`, p);
        });
        console.log('✅ Sample products ditambahkan.');
      }
    });

    // Insert akun admin default
    bcrypt.hash('admin123', 10).then(hashedPassword => {
      db.run(`INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        ['Admin', 'admin@example.com', hashedPassword, 'admin'],
        err => {
          if (err) {
            console.error('❌ Gagal tambah admin:', err.message);
          } else {
            console.log('✅ Akun admin tersedia (admin@example.com / admin123)');
          }
        });
    });
  });
};

initDB();

// ------------------ MIDDLEWARE ------------------
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'Token diperlukan' });

  jwt.verify(auth.split(' ')[1], SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Token tidak valid' });
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  });
};

// ------------------ ROUTES ------------------

// Shortcut ke /admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin-dashboard.html'));
});

// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const userRole = role || 'user';

  db.run(
    `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    [name, email, hashed, userRole],
    err => {
      if (err) return res.status(400).json({ message: 'Email sudah digunakan' });
      res.json({ message: 'Registrasi berhasil' });
    }
  );
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err || !user) return res.status(400).json({ message: 'Email tidak ditemukan' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Password salah' });
    const token = jwt.sign({ userId: user.id, role: user.role }, SECRET);
    res.json({ token, role: user.role });
  });
});

// Ambil semua produk
app.get('/api/products', (req, res) => {
  db.all(`SELECT * FROM products`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = rows.map(p => ({
      ...p,
      image_url: `/images/${p.image}`
    }));
    res.json(formatted);
  });
});

// Tambah produk
app.post('/api/products', authenticate, (req, res) => {
  if (req.role !== 'admin') return res.status(403).json({ message: 'Hanya admin' });
  const { name, price, image } = req.body;
  if (!name || !price || !image) return res.status(400).json({ message: 'Semua field wajib diisi' });

  db.run(`INSERT INTO products (name, price, image) VALUES (?, ?, ?)`, [name, price, image], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Produk berhasil ditambahkan', id: this.lastID });
  });
});

// Edit produk
app.put('/api/products/:id', authenticate, (req, res) => {
  if (req.role !== 'admin') return res.status(403).json({ message: 'Hanya admin' });
  const { id } = req.params;
  const { name, price } = req.body;

  db.run(`UPDATE products SET name = ?, price = ? WHERE id = ?`, [name, price, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Produk diperbarui' });
  });
});

// Hapus produk
app.delete('/api/products/:id', authenticate, (req, res) => {
  if (req.role !== 'admin') return res.status(403).json({ message: 'Hanya admin' });

  const { id } = req.params;
  db.run(`DELETE FROM products WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    res.json({ message: 'Produk dihapus' });
  });
});

// Tambah ke keranjang
app.post('/api/cart', authenticate, (req, res) => {
  const { productId } = req.body;
  db.run(`INSERT INTO cart (user_id, product_id) VALUES (?, ?)`, [req.userId, productId], err => {
    if (err) return res.status(500).json({ message: 'Gagal tambah ke keranjang' });
    res.json({ message: 'Berhasil ditambahkan ke keranjang' });
  });
});

// Lihat keranjang
app.get('/api/cart', authenticate, (req, res) => {
  db.all(
    `SELECT p.name, p.price, p.image, COUNT(c.product_id) as quantity
     FROM cart c JOIN products p ON c.product_id = p.id
     WHERE c.user_id = ? GROUP BY c.product_id`,
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Gagal ambil keranjang' });
      const formatted = rows.map(p => ({
        ...p,
        image_url: `/images/${p.image}`
      }));
      res.json(formatted);
    }
  );
});

// Checkout
app.post('/api/checkout', authenticate, (req, res) => {
  db.run(`DELETE FROM cart WHERE user_id = ?`, [req.userId], err => {
    if (err) return res.status(500).json({ message: 'Checkout gagal' });
    res.json({ message: 'Checkout berhasil' });
  });
});

// Admin: daftar semua user
app.get('/api/users', (req, res) => {
  db.all(`SELECT id, name, email FROM users`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Fallback ke index.html
app.get(/^\/(?!api|images).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ------------------ START SERVER ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

