const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDB() {
  const client = await pool.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_data BYTEA`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_mime_type VARCHAR(50)`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS line_id VARCHAR(100)`);
    await client.query(`ALTER TABLE orders ALTER COLUMN customer_email DROP NOT NULL`);

    // Migration 001: 商品多圖支援
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id              SERIAL PRIMARY KEY,
        product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        image_data      BYTEA NOT NULL,
        image_mime_type VARCHAR(50) NOT NULL DEFAULT 'image/jpeg',
        sort_order      SMALLINT NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)`);

    // 將舊的單張圖片欄位遷移至 product_images（若欄位仍存在）
    const colCheck = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_data'`
    );
    if (colCheck.rows.length > 0) {
      await client.query(`
        INSERT INTO product_images (product_id, image_data, image_mime_type, sort_order)
        SELECT id, image_data, COALESCE(image_mime_type, 'image/jpeg'), 0
        FROM products WHERE image_data IS NOT NULL
      `);
      await client.query(`ALTER TABLE products DROP COLUMN image_data`);
      await client.query(`ALTER TABLE products DROP COLUMN IF EXISTS image_mime_type`);
    }

    const adminExists = await client.query(
      'SELECT id FROM admins WHERE username = $1',
      [process.env.ADMIN_USERNAME || 'admin']
    );
    if (adminExists.rows.length === 0) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'lovehearing2024', 10);
      await client.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [
        process.env.ADMIN_USERNAME || 'admin',
        hash,
      ]);
      console.log('Default admin created: admin / lovehearing2024');
    }

    const productCount = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(productCount.rows[0].count) === 0) {
      await seedProducts(client);
    }

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

async function seedProducts(client) {
  const products = [
    {
      name: '手工蠟燭禮盒',
      description: '愛心志工手工製作，薰衣草香氣，舒緩身心，附精美包裝盒，適合送禮自用兩相宜。',
      price: 350,
      stock: 20,
      image_url: 'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=400&q=80',
      category: '生活用品',
    },
    {
      name: '有機茶葉禮盒',
      description: '台灣高山有機茶，精選阿里山烏龍茶，茶香四溢，附精美木盒包裝，送禮首選。',
      price: 580,
      stock: 15,
      image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
      category: '食品',
    },
    {
      name: '蒲公英刺繡筆袋',
      description: '義工媽媽們親手刺繡製作，蒲公英圖案，每件獨一無二，用愛心縫製的實用好物。',
      price: 280,
      stock: 30,
      image_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&q=80',
      category: '文具',
    },
    {
      name: '愛心餅乾禮盒',
      description: '媽媽們親手烘培，多種口味可選，無添加防腐劑，新鮮健康美味，適合全家享用。',
      price: 250,
      stock: 25,
      image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80',
      category: '食品',
    },
    {
      name: '手作陶瓷杯組',
      description: '陶藝治療課程學員作品，每件獨特的手工陶瓷，溫潤質感，兩件一組，喝茶喝咖啡都適合。',
      price: 680,
      stock: 10,
      image_url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&q=80',
      category: '生活用品',
    },
    {
      name: '聽損主題繪本套組',
      description: '專為孩童設計的聽損主題繪本，讓孩子理解並尊重不同的朋友，培養同理心，三冊一套。',
      price: 450,
      stock: 18,
      image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
      category: '書籍',
    },
  ];

  for (const p of products) {
    await client.query(
      'INSERT INTO products (name, description, price, stock, image_url, category) VALUES ($1, $2, $3, $4, $5, $6)',
      [p.name, p.description, p.price, p.stock, p.image_url, p.category]
    );
  }
  console.log('Sample products seeded');
}

module.exports = { pool, initDB };
