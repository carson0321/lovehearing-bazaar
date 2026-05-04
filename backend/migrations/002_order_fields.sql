-- Migration 002: 訂單新增運送方式、匯款帳號後五碼欄位
-- 執行方式：psql $DATABASE_URL -f migrations/002_order_fields.sql

BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(20) NOT NULL DEFAULT 'pickup';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transfer_last5  CHAR(5);

COMMIT;
