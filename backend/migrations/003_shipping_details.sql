-- Migration 003: 訂單新增宅配地址、7-11 門市資訊欄位
-- 執行方式：psql $DATABASE_URL -f migrations/003_shipping_details.sql

BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address VARCHAR(500);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_name       VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id         VARCHAR(20);

COMMIT;
