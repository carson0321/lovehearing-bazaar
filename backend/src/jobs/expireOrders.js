const { pool } = require('../db');

const TIMEOUT_HOURS = 3;
const INTERVAL_MS = 5 * 60 * 1000; // run every 5 minutes

async function expireOrders() {
  const expired = await pool.query(
    `SELECT id FROM orders
     WHERE status = 'pending'
       AND transfer_last5 IS NULL
       AND created_at < NOW() - INTERVAL '${TIMEOUT_HOURS} hours'`
  );

  for (const { id } of expired.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updated = await client.query(
        `UPDATE orders SET status = 'expired' WHERE id = $1 AND status = 'pending' RETURNING id`,
        [id]
      );

      if (updated.rows.length > 0) {
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
        console.log(`[expireOrders] order ${id} expired, stock restored`);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[expireOrders] failed for order ${id}:`, err.message);
    } finally {
      client.release();
    }
  }
}

function startExpireJob() {
  expireOrders().catch((err) => console.error('[expireOrders] initial run error:', err.message));
  setInterval(() => {
    expireOrders().catch((err) => console.error('[expireOrders] error:', err.message));
  }, INTERVAL_MS);
}

module.exports = { startExpireJob };
