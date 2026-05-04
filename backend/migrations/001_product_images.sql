-- Migration 001: 商品多圖支援（最多 3 張）
-- 執行方式：psql $DATABASE_URL -f migrations/001_product_images.sql
-- 此 migration 為冪等操作，重複執行不會出錯。

BEGIN;

-- 建立 product_images 資料表
CREATE TABLE IF NOT EXISTS product_images (
  id              SERIAL PRIMARY KEY,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_data      BYTEA NOT NULL,
  image_mime_type VARCHAR(50) NOT NULL DEFAULT 'image/jpeg',
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- 將舊的單張圖片從 products 欄位遷移至 product_images（僅在舊欄位存在時執行）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image_data'
  ) THEN
    INSERT INTO product_images (product_id, image_data, image_mime_type, sort_order)
    SELECT id, image_data, COALESCE(image_mime_type, 'image/jpeg'), 0
    FROM products
    WHERE image_data IS NOT NULL;

    ALTER TABLE products DROP COLUMN image_data;
    ALTER TABLE products DROP COLUMN IF EXISTS image_mime_type;
  END IF;
END $$;

COMMIT;
