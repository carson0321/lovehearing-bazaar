const express = require('express');
const multer = require('multer');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只接受圖片檔案'));
  },
});

const SELECT_COLS = `id, name, description, price, stock, image_url, category, active, created_at,
  (image_data IS NOT NULL) AS has_image`;

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM products WHERE active = TRUE ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM products ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.get('/:id/image', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT image_data, image_mime_type FROM products WHERE id=$1',
      [req.params.id]
    );
    const row = result.rows[0];
    if (!row || !row.image_data) return res.status(404).end();
    res.setHeader('Content-Type', row.image_mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(row.image_data);
  } catch (err) {
    res.status(500).end();
  }
});

router.post('/:id/image', authMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '請選擇圖片' });
  try {
    const result = await pool.query(
      `UPDATE products SET image_data=$1, image_mime_type=$2 WHERE id=$3 RETURNING ${SELECT_COLS}`,
      [req.file.buffer, req.file.mimetype, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '商品不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '上傳失敗' });
  }
});

router.delete('/:id/image', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE products SET image_data=NULL, image_mime_type=NULL WHERE id=$1',
      [req.params.id]
    );
    res.json({ message: '圖片已清除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '清除失敗' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { name, description, price, stock, image_url, category } = req.body;
  if (!name || price === undefined || price === null) {
    return res.status(400).json({ error: '商品名稱和價格為必填' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock, image_url, category)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${SELECT_COLS}`,
      [name, description || '', price, stock || 0, image_url || '', category || '義賣商品']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, image_url, category, active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products
       SET name=$1, description=$2, price=$3, stock=$4, image_url=$5, category=$6, active=$7
       WHERE id=$8 RETURNING ${SELECT_COLS}`,
      [name, description, price, stock, image_url, category, active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '商品不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: '商品已刪除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
