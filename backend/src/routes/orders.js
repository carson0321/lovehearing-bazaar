const express = require('express');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/', async (req, res) => {
  const { customer_name, customer_email, customer_phone, note, items } = req.body;

  if (!customer_name || !customer_email || !items || items.length === 0) {
    return res.status(400).json({ error: '請填寫姓名、Email，並選擇至少一件商品' });
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

    const orderNumber = 'ORD-' + Date.now().toString().slice(-8);
    const orderResult = await client.query(
      `INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, note, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [orderNumber, customer_name, customer_email, customer_phone || '', note || '', total]
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
    res.status(201).json({ order_number: order.order_number, total_amount: total });
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
  const validStatuses = ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'];
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

module.exports = router;
