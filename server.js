const express = require('express');
const cors = require('cors');
const path = require('path');
const { init } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 4000;

const VALID_CATEGORIES = ['Programming', 'Fiction', 'Science', 'History', 'Business', 'Others'];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db; // mysql2 pool, set once init() resolves

// ---------- helpers ----------
function serializeBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    year: row.year,
    copies: row.copies,
    borrowed: row.borrowed,
    available: row.copies - row.borrowed,
    favorite: !!row.favorite,
    createdAt: row.created_at,
  };
}

function validateBookPayload(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) errors.push('title is required');
  }
  if (!partial || body.author !== undefined) {
    if (!body.author || typeof body.author !== 'string' || !body.author.trim()) errors.push('author is required');
  }
  if (!partial || body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category)) errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (body.copies !== undefined) {
    if (!Number.isInteger(body.copies) || body.copies < 0) errors.push('copies must be a non-negative integer');
  }
  if (body.borrowed !== undefined) {
    if (!Number.isInteger(body.borrowed) || body.borrowed < 0) errors.push('borrowed must be a non-negative integer');
  }
  if (body.year !== undefined && !Number.isInteger(body.year)) errors.push('year must be an integer');
  return errors;
}

// ---------- routes ----------

// GET /api/books?search=&category=&favorite=true
app.get('/api/books', async (req, res, next) => {
  try {
    const { search, category, favorite } = req.query;
    let sql = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (title LIKE ? OR author LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (favorite === 'true') {
      sql += ' AND favorite = 1';
    }
    sql += ' ORDER BY id DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows.map(serializeBook));
  } catch (e) { next(e); }
});

// GET /api/books/:id
app.get('/api/books/:id', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Book not found' });
    res.json(serializeBook(rows[0]));
  } catch (e) { next(e); }
});

// POST /api/books
app.post('/api/books', async (req, res, next) => {
  try {
    const body = req.body || {};
    const errors = validateBookPayload(body);
    if (errors.length) return res.status(400).json({ errors });

    const [result] = await db.query(
      `INSERT INTO books (title, author, category, year, copies, borrowed, favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.title.trim(),
        body.author.trim(),
        body.category,
        body.year ?? 2024,
        body.copies ?? 1,
        body.borrowed ?? 0,
        body.favorite ? 1 : 0,
      ]
    );
    const [rows] = await db.query('SELECT * FROM books WHERE id = ?', [result.insertId]);
    res.status(201).json(serializeBook(rows[0]));
  } catch (e) { next(e); }
});

// PUT /api/books/:id (full/partial update)
app.put('/api/books/:id', async (req, res, next) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Book not found' });

    const body = req.body || {};
    const errors = validateBookPayload(body, { partial: true });
    if (errors.length) return res.status(400).json({ errors });

    const merged = {
      title: body.title !== undefined ? body.title.trim() : existing.title,
      author: body.author !== undefined ? body.author.trim() : existing.author,
      category: body.category !== undefined ? body.category : existing.category,
      year: body.year !== undefined ? body.year : existing.year,
      copies: body.copies !== undefined ? body.copies : existing.copies,
      borrowed: body.borrowed !== undefined ? body.borrowed : existing.borrowed,
      favorite: body.favorite !== undefined ? (body.favorite ? 1 : 0) : existing.favorite,
    };

    await db.query(
      `UPDATE books SET title=?, author=?, category=?, year=?, copies=?, borrowed=?, favorite=?
       WHERE id = ?`,
      [merged.title, merged.author, merged.category, merged.year, merged.copies, merged.borrowed, merged.favorite, req.params.id]
    );

    const [rows] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
    res.json(serializeBook(rows[0]));
  } catch (e) { next(e); }
});

// PATCH /api/books/:id/favorite
app.patch('/api/books/:id/favorite', async (req, res, next) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Book not found' });

    const next_ = req.body && typeof req.body.favorite === 'boolean' ? req.body.favorite : !existing.favorite;
    await db.query('UPDATE books SET favorite = ? WHERE id = ?', [next_ ? 1 : 0, req.params.id]);
    const [rows] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
    res.json(serializeBook(rows[0]));
  } catch (e) { next(e); }
});

// DELETE /api/books/:id
app.delete('/api/books/:id', async (req, res, next) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (!existingRows[0]) return res.status(404).json({ error: 'Book not found' });
    await db.query('DELETE FROM books WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

// GET /api/categories
app.get('/api/categories', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT category, COUNT(*) as count, SUM(copies) as totalCopies
       FROM books GROUP BY category`
    );
    res.json({
      all: VALID_CATEGORIES,
      counts: rows.reduce((acc, r) => {
        acc[r.category] = { count: Number(r.count), totalCopies: Number(r.totalCopies) };
        return acc;
      }, {}),
    });
  } catch (e) { next(e); }
});

// GET /api/stats
app.get('/api/stats', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) as titles, COALESCE(SUM(copies),0) as total, COALESCE(SUM(borrowed),0) as borrowed
       FROM books`
    );
    const row = rows[0];
    const total = Number(row.total);
    const borrowed = Number(row.borrowed);
    res.json({
      titles: Number(row.titles),
      total,
      borrowed,
      available: total - borrowed,
    });
  } catch (e) { next(e); }
});

// Fallback to the SPA for any non-API route
app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

init()
  .then((pool) => {
    db = pool;
    app.listen(PORT, () => {
      console.log(`\n📚 ShelfSpace (MySQL) running at http://localhost:${PORT}\n`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MySQL:', err.message);
    console.error('Check your .env file (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) and that MySQL is running.');
    process.exit(1);
  });
