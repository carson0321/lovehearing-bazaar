const express = require('express');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const SHIPPING_FEES = { '711': 80, delivery: 100, pickup: 0 };

router.post('/', async (req, res) => {
  const { customer_name, customer_email, customer_phone, line_id, note, shipping_method, items } = req.body;

  if (!customer_name || !customer_email || !customer_phone || !shipping_method || !items || items.length === 0) {
    return res.status(400).json({ error: '請填寫所有必填欄位並選擇至少一件商品' });
  }
  if (!SHIPPING_FEES.hasOwnProperty(shipping_method)) {
    return res.status(400).json({ error: '無效的運送方式' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const resolvedItems = [];

    for (const item of items) {
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = $1 AND active = TRUE FOR UPDATE',
        [item.product_id]
      );
      if (productResult.rows.length === 0) {
        throw new Error(`商品不存在或已下架`);
      }
      const product = productResult.rows[0];
      if (product.stock < item.quantity) {
        throw new Error(`「${product.name}」庫存不足，目前剩餘 ${product.stock} 件`);
      }

      const subtotal = parseFloat(product.price) * item.quantity;
      total += subtotal;
      resolvedItems.push({ product, quantity: item.quantity, subtotal });

      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [
        item.quantity,
        product.id,
      ]);
    }

    const shippingFee = SHIPPING_FEES[shipping_method];
    const grandTotal = total + shippingFee;

    const orderNumber = 'ORD-' + Date.now().toString().slice(-8);
    const orderResult = await client.query(
      `INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, line_id, note, shipping_method, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [orderNumber, customer_name, customer_email, customer_phone, line_id || '', note || '', shipping_method, grandTotal]
    );
    const order = orderResult.rows[0];

    for (const item of resolvedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, item.product.id, item.product.name, item.quantity, item.product.price, item.subtotal]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ order_number: order.order_number, total_amount: grandTotal, shipping_fee: shippingFee });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message || '建立訂單失敗' });
  } finally {
    client.release();
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*,
         json_agg(json_build_object(
           'product_name', oi.product_name,
           'quantity', oi.quantity,
           'unit_price', oi.unit_price,
           'subtotal', oi.subtotal
         ) ORDER BY oi.id) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'shipped', 'completed', 'cancelled', 'expired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '無效的訂單狀態' });
  }

  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '訂單不存在' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query('SELECT status FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '訂單不存在' });
    }
    const { status } = orderResult.rows[0];

    // Restore stock only if payment was never confirmed
    if (status === 'pending' || status === 'confirmed') {
      const items = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [id]
      );
      for (const item of items.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    }

    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    await client.query('DELETE FROM orders WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  } finally {
    client.release();
  }
});

// 客戶查詢訂單（驗證 email + 電話）
router.post('/transfer/lookup', async (req, res) => {
  const { customer_email, customer_phone } = req.body;

  if (!customer_email || !customer_phone) {
    return res.status(400).json({ error: '請填寫 Email 與聯絡電話' });
  }

  try {
    const result = await pool.query(
      `SELECT o.order_number, o.created_at, o.total_amount, o.shipping_method, o.transfer_last5,
         json_agg(json_build_object('product_name', oi.product_name, 'quantity', oi.quantity) ORDER BY oi.id) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.customer_email = $1 AND o.customer_phone = $2
       GROUP BY o.order_number, o.created_at, o.total_amount, o.shipping_method, o.transfer_last5
       ORDER BY o.created_at DESC`,
      [customer_email.trim(), customer_phone.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '查無符合的訂單，請確認 Email 與電話是否正確' });
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 客戶回報匯款（需指定訂單編號）
router.post('/transfer', async (req, res) => {
  const { customer_email, customer_phone, order_number, transfer_last5 } = req.body;

  if (!customer_email || !customer_phone || !order_number || !transfer_last5) {
    return res.status(400).json({ error: '請填寫所有必填欄位' });
  }
  if (!/^\d{5}$/.test(transfer_last5)) {
    return res.status(400).json({ error: '匯款帳號後五碼須為5位數字' });
  }

  try {
    const found = await pool.query(
      `SELECT id, order_number FROM orders
       WHERE customer_email = $1 AND customer_phone = $2 AND order_number = $3`,
      [customer_email.trim(), customer_phone.trim(), order_number.trim()]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ error: '查無符合的訂單' });
    }
    const order = found.rows[0];
    await pool.query(
      'UPDATE orders SET transfer_last5 = $1 WHERE id = $2',
      [transfer_last5, order.id]
    );
    res.json({ order_number: order.order_number });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 後台：取得已回報匯款的訂單
router.get('/transfers', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*,
         json_agg(json_build_object(
           'product_name', oi.product_name,
           'quantity', oi.quantity,
           'unit_price', oi.unit_price,
           'subtotal', oi.subtotal
         ) ORDER BY oi.id) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.transfer_last5 IS NOT NULL
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;
