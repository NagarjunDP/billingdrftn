-- ============================================================
-- DRFTN Billing System — Production Schema Migration v3
-- Preserves existing DB tables & data
-- ============================================================

-- 1. Create enums
DO $$ BEGIN
  CREATE TYPE "invoice_status" AS ENUM ('draft','payment_pending','paid','sent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create store_settings
CREATE TABLE IF NOT EXISTS "store_settings" (
  "id"               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "store_name"       text NOT NULL DEFAULT 'DRFTN Clothing',
  "legal_name"       text NOT NULL DEFAULT 'DRFTN Clothing',
  "gstin"            text NOT NULL DEFAULT '',
  "address"          text NOT NULL DEFAULT '',
  "city"             text NOT NULL DEFAULT '',
  "state"            text NOT NULL DEFAULT 'Karnataka',
  "state_code"       text NOT NULL DEFAULT '29',
  "pincode"          text NOT NULL DEFAULT '',
  "phone"            text NOT NULL DEFAULT '',
  "email"            text NOT NULL DEFAULT '',
  "invoice_prefix"   text NOT NULL DEFAULT 'DRFTN',
  "current_fy"       text NOT NULL DEFAULT '25-26',
  "current_sequence" integer NOT NULL DEFAULT 0,
  "terms_footer"     text NOT NULL DEFAULT 'Thank you for shopping with DRFTN Clothing. All sales are final. GST paid as applicable.',
  "updated_at"       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "store_settings" ("store_name","legal_name","gstin","state","state_code","invoice_prefix","current_fy","current_sequence")
VALUES ('DRFTN Clothing','DRFTN Clothing','','Karnataka','29','DRFTN','25-26',0)
ON CONFLICT DO NOTHING;

-- 3. Enhance existing quick_products table
ALTER TABLE "quick_products" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "quick_products" ADD COLUMN IF NOT EXISTS "hsn_code" text NOT NULL DEFAULT '6203';
ALTER TABLE "quick_products" ADD COLUMN IF NOT EXISTS "gst_rate" integer NOT NULL DEFAULT 5;
ALTER TABLE "quick_products" ADD COLUMN IF NOT EXISTS "price_paise" bigint;
ALTER TABLE "quick_products" ADD COLUMN IF NOT EXISTS "size" text;
ALTER TABLE "quick_products" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "quick_products" ADD COLUMN IF NOT EXISTS "stock" integer;
ALTER TABLE "quick_products" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
ALTER TABLE "quick_products" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now();

-- Populate price_paise from price column where price_paise is null
UPDATE "quick_products"
SET "price_paise" = ROUND(CAST("price" AS numeric) * 100)::bigint
WHERE "price_paise" IS NULL AND "price" IS NOT NULL;

-- Default price_paise to 0 if still null
UPDATE "quick_products" SET "price_paise" = 0 WHERE "price_paise" IS NULL;

-- Make price_paise NOT NULL
ALTER TABLE "quick_products" ALTER COLUMN "price_paise" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='quick_products' AND indexname='quick_products_code_idx') THEN
    CREATE INDEX "quick_products_code_idx" ON "quick_products"("code");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='quick_products' AND indexname='quick_products_name_idx') THEN
    CREATE INDEX "quick_products_name_idx" ON "quick_products"("name");
  END IF;
END $$;

-- 4. Check if old invoices table exists with numeric columns, and replace with new schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='invoices' AND column_name='subtotal' AND data_type='numeric'
  ) THEN
    CREATE TABLE IF NOT EXISTS "_old_invoices" AS SELECT * FROM "invoices";
    CREATE TABLE IF NOT EXISTS "_old_invoice_items" AS SELECT * FROM "invoice_items";
    
    DROP TABLE IF EXISTS "invoice_audit_log" CASCADE;
    DROP TABLE IF EXISTS "credit_notes" CASCADE;
    DROP TABLE IF EXISTS "invoice_items" CASCADE;
    DROP TABLE IF EXISTS "invoices" CASCADE;
  END IF;
END $$;

-- 5. Create invoices table
CREATE TABLE IF NOT EXISTS "invoices" (
  "id"                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "invoice_number"       text UNIQUE,
  "financial_year"       text NOT NULL DEFAULT '25-26',
  "sequence"             integer,
  "buyer_name"           text,
  "buyer_phone"          text,
  "buyer_email"          text,
  "buyer_gstin"          text,
  "buyer_state"          text,
  "buyer_state_code"     text,
  "is_inter_state"       boolean NOT NULL DEFAULT false,
  "payment_mode"         text NOT NULL DEFAULT 'cash',
  "subtotal_paise"       bigint NOT NULL DEFAULT 0,
  "total_discount_paise" bigint NOT NULL DEFAULT 0,
  "taxable_value_paise"  bigint NOT NULL DEFAULT 0,
  "total_cgst_paise"     bigint NOT NULL DEFAULT 0,
  "total_sgst_paise"     bigint NOT NULL DEFAULT 0,
  "total_igst_paise"     bigint NOT NULL DEFAULT 0,
  "rounding_paise"       bigint NOT NULL DEFAULT 0,
  "grand_total_paise"    bigint NOT NULL DEFAULT 0,
  "status"               "invoice_status" NOT NULL DEFAULT 'draft',
  "notes"                text,
  "created_at"           timestamptz NOT NULL DEFAULT now(),
  "paid_at"              timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='invoices' AND indexname='invoices_status_idx') THEN
    CREATE INDEX "invoices_status_idx" ON "invoices"("status");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='invoices' AND indexname='invoices_created_at_idx') THEN
    CREATE INDEX "invoices_created_at_idx" ON "invoices"("created_at");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='invoices' AND indexname='invoices_financial_year_idx') THEN
    CREATE INDEX "invoices_financial_year_idx" ON "invoices"("financial_year");
  END IF;
END $$;

-- Migrate old invoice data if backup exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='_old_invoices') THEN
    INSERT INTO "invoices" (
      "id","invoice_number","financial_year","sequence",
      "buyer_name","buyer_phone",
      "subtotal_paise","total_cgst_paise","total_sgst_paise","grand_total_paise",
      "taxable_value_paise",
      "status","created_at","paid_at"
    )
    SELECT
      "id",
      CASE WHEN "invoice_number" IS NOT NULL
        THEN 'DRFTN/25-26/' || LPAD("invoice_number"::text, 4, '0')
        ELSE NULL END,
      COALESCE("financial_year", '25-26'),
      "invoice_number",
      "customer_name",
      "customer_phone",
      ROUND(CAST("subtotal" AS numeric) * 100)::bigint,
      ROUND(CAST("total_cgst" AS numeric) * 100)::bigint,
      ROUND(CAST("total_sgst" AS numeric) * 100)::bigint,
      ROUND(CAST("grand_total" AS numeric) * 100)::bigint,
      ROUND(CAST("subtotal" AS numeric) * 100)::bigint,
      "status",
      "created_at",
      "paid_at"
    FROM "_old_invoices"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;

-- 6. Create invoice_items table
CREATE TABLE IF NOT EXISTS "invoice_items" (
  "id"                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "invoice_id"          uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "product_id"          uuid REFERENCES "quick_products"("id"),
  "product_name"        text NOT NULL,
  "hsn_code"            text NOT NULL DEFAULT '6203',
  "gst_rate"            integer NOT NULL DEFAULT 5,
  "quantity"            integer NOT NULL DEFAULT 1,
  "unit_price_paise"    bigint NOT NULL,
  "discount_pct"        integer NOT NULL DEFAULT 0,
  "discount_paise"      bigint NOT NULL DEFAULT 0,
  "taxable_value_paise" bigint NOT NULL,
  "cgst_paise"          bigint NOT NULL DEFAULT 0,
  "sgst_paise"          bigint NOT NULL DEFAULT 0,
  "igst_paise"          bigint NOT NULL DEFAULT 0,
  "line_total_paise"    bigint NOT NULL,
  "created_at"          timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='invoice_items' AND indexname='invoice_items_invoice_id_idx') THEN
    CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");
  END IF;
END $$;

-- Migrate old items if backup exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='_old_invoice_items') THEN
    INSERT INTO "invoice_items" (
      "id","invoice_id","product_name","hsn_code","gst_rate",
      "unit_price_paise","taxable_value_paise","cgst_paise","sgst_paise","line_total_paise","created_at"
    )
    SELECT
      "id",
      "invoice_id",
      "product_name",
      COALESCE("hsn_code", '6203'),
      ROUND(CAST("gst_rate" AS numeric))::integer,
      ROUND(CAST("unit_price" AS numeric) * 100)::bigint,
      ROUND(CAST("unit_price" AS numeric) * 100)::bigint,
      ROUND(CAST("cgst_amount" AS numeric) * 100)::bigint,
      ROUND(CAST("sgst_amount" AS numeric) * 100)::bigint,
      ROUND(CAST("line_total" AS numeric) * 100)::bigint,
      "created_at"
    FROM "_old_invoice_items"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;

-- 7. Audit log, Credit Notes, Purchase Logs, Exports
CREATE TABLE IF NOT EXISTS "invoice_audit_log" (
  "id"          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "invoice_id"  uuid NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
  "event_type"  text NOT NULL,
  "old_value"   jsonb,
  "new_value"   jsonb,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "credit_notes" (
  "id"                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "original_invoice_id"  uuid NOT NULL REFERENCES "invoices"("id"),
  "reason"               text NOT NULL,
  "amount_paise"         bigint NOT NULL,
  "created_at"           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "purchase_logs" (
  "id"                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "supplier_name"         text NOT NULL,
  "supplier_gstin"        text,
  "invoice_ref"           text,
  "purchase_amount_paise" bigint NOT NULL,
  "gst_paid_paise"        bigint NOT NULL,
  "purchase_date"         timestamptz NOT NULL DEFAULT now(),
  "created_at"            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "gst_filing_exports" (
  "id"          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "period"      text NOT NULL,
  "export_type" text NOT NULL,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

-- Update sequence in store_settings
UPDATE "store_settings"
SET "current_sequence" = COALESCE(
  (SELECT MAX("sequence") FROM "invoices" WHERE "sequence" IS NOT NULL), 0
);
