const express = require('express');
const multer = require('multer');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const MAX_IMAGES = 3;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只接受圖片檔案'));
  },
});

// image_ids subquery reused in list SELECT statements
const IMAGE_IDS_SUBQ = `(
  SELECT COALESCE(json_agg(pi.id ORDER BY pi.sort_order, pi.created_at), '[]'::json)
  FROM product_images pi WHERE pi.product_id = products.id
) AS image_ids`;

const SELECT_COLS = `id, name, description, price, stock, image_url, category, active, created_at, ${IMAGE_IDS_SUBQ}`;

// Public product list
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

// Admin product list
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

// Serve a single image by product_images.id
// Must be registered before /:id routes to avoid conflict
router.get('/images/:imageId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT image_data, image_mime_type FROM product_images WHERE id=$1',
      [req.params.imageId]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).end();
    res.setHeader('Content-Type', row.image_mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(row.image_data);
  } catch (err) {
    res.status(500).end();
  }
});

// Delete a single image by product_images.id
router.delete('/images/:imageId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM product_images WHERE id=$1 RETURNING id',
      [req.params.imageId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '圖片不存在' });
    res.json({ message: '圖片已刪除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '刪除失敗' });
  }
});

// Upload one image for a product (max MAX_IMAGES total)
router.post('/:id/images', authMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '請選擇圖片' });
  const productId = req.params.id;
  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM product_images WHERE product_id=$1',
      [productId]
    );
    const current = parseInt(countResult.rows[0].count);
    if (current >= MAX_IMAGES) {
      return res.status(400).json({ error: `最多只能上傳 ${MAX_IMAGES} 張圖片` });
    }
    const result = await pool.query(
      `INSERT INTO product_images (product_id, image_data, image_mime_type, sort_order)
       VALUES ($1,$2,$3,$4) RETURNING id, sort_order`,
      [productId, req.file.buffer, req.file.mimetype, current]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '上傳失敗' });
  }
});

// Create product
router.post('/', authMiddleware, async (req, res) => {
  const { name, description, price, stock, image_url, category } = req.body;
  if (!name || price === undefined || price === null) {
    return res.status(400).json({ error: '商品名稱和價格為必填' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock, image_url, category)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, description || '', price, stock || 0, image_url || '', category || '義賣商品']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// Update product
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, image_url, category, active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products
       SET name=$1, description=$2, price=$3, stock=$4, image_url=$5, category=$6, active=$7
       WHERE id=$8 RETURNING id`,
      [name, description, price, stock, image_url, category, active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '商品不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// Delete product
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
