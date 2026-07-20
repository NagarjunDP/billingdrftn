CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE invoice_status AS ENUM ('draft', 'payment_pending', 'paid', 'sent');

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number INTEGER UNIQUE,
  financial_year TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'draft',
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  product_name TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  hsn_code TEXT NOT NULL DEFAULT '6203',
  gst_rate NUMERIC(5,2) NOT NULL,
  cgst_amount NUMERIC(12,2) NOT NULL,
  sgst_amount NUMERIC(12,2) NOT NULL,
  line_total NUMERIC(12,2) NOT NULL,
  tag_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  event_type TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_invoice_id UUID NOT NULL REFERENCES invoices(id),
  reason TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  purchase_amount NUMERIC(12,2) NOT NULL,
  gst_paid NUMERIC(12,2) NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE billing_invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION compute_financial_year(ts TIMESTAMPTZ)
RETURNS TEXT AS $$
DECLARE
  year_start INT;
BEGIN
  year_start := EXTRACT(YEAR FROM ts);
  IF EXTRACT(MONTH FROM ts) < 4 THEN
    year_start := year_start - 1;
  END IF;
  RETURN year_start::TEXT || '-' || RIGHT((year_start + 1)::TEXT, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION prevent_invoice_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.invoice_number IS NOT NULL AND NEW.invoice_number IS DISTINCT FROM OLD.invoice_number THEN
    RAISE EXCEPTION 'invoice_number is immutable';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at is immutable';
  END IF;

  IF OLD.paid_at IS NOT NULL AND NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
    RAISE EXCEPTION 'paid_at is immutable after set';
  END IF;

  IF OLD.sent_at IS NOT NULL AND NEW.sent_at IS DISTINCT FROM OLD.sent_at THEN
    RAISE EXCEPTION 'sent_at is immutable after set';
  END IF;

  IF OLD.status IN ('paid', 'sent') THEN
    IF NEW.customer_name IS DISTINCT FROM OLD.customer_name
      OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone
      OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
      OR NEW.total_cgst IS DISTINCT FROM OLD.total_cgst
      OR NEW.total_sgst IS DISTINCT FROM OLD.total_sgst
      OR NEW.grand_total IS DISTINCT FROM OLD.grand_total
      OR NEW.financial_year IS DISTINCT FROM OLD.financial_year
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
      OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
    THEN
      RAISE EXCEPTION 'paid/sent invoice is immutable';
    END IF;

    IF OLD.status = 'sent' AND NEW.status IS DISTINCT FROM 'sent' THEN
      RAISE EXCEPTION 'sent invoice status is immutable';
    END IF;

    IF OLD.status = 'paid' AND NEW.status NOT IN ('paid', 'sent') THEN
      RAISE EXCEPTION 'paid invoice status can only transition to sent';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_invoice_mutation
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION prevent_invoice_mutation();

CREATE OR REPLACE FUNCTION prevent_invoice_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Invoices cannot be hard deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_invoice_delete
BEFORE DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION prevent_invoice_delete();

CREATE OR REPLACE FUNCTION guard_invoice_item_changes()
RETURNS TRIGGER AS $$
DECLARE
  st invoice_status;
BEGIN
  SELECT status INTO st FROM invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF st IS NULL THEN
    RAISE EXCEPTION 'Invoice missing for line item operation';
  END IF;
  IF st <> 'draft' THEN
    RAISE EXCEPTION 'Invoice items are mutable only while invoice is draft';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guard_invoice_item_insert
BEFORE INSERT ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION guard_invoice_item_changes();

CREATE TRIGGER trg_guard_invoice_item_update
BEFORE UPDATE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION guard_invoice_item_changes();

CREATE TRIGGER trg_guard_invoice_item_delete
BEFORE DELETE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION guard_invoice_item_changes();

CREATE OR REPLACE FUNCTION audit_invoice_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO invoice_audit_log(invoice_id, event_type, old_value, new_value)
    VALUES (NEW.id, 'invoice_created', NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO invoice_audit_log(invoice_id, event_type, old_value, new_value)
    VALUES (NEW.id, 'invoice_updated', to_jsonb(OLD), to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_invoice
AFTER INSERT OR UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION audit_invoice_changes();

CREATE OR REPLACE FUNCTION finalize_invoice_payment(p_invoice_id UUID, p_customer_phone TEXT, p_customer_name TEXT)
RETURNS TABLE (
  id UUID,
  invoice_number INTEGER,
  financial_year TEXT,
  status invoice_status,
  paid_at TIMESTAMPTZ
) AS $$
BEGIN
  IF p_customer_phone !~ '^[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'Valid 10-digit Indian mobile is required';
  END IF;

  UPDATE invoices
  SET
    customer_phone = p_customer_phone,
    customer_name = COALESCE(NULLIF(p_customer_name, ''), customer_name),
    status = 'payment_pending'
  WHERE invoices.id = p_invoice_id
    AND invoices.status = 'draft';

  WITH sums AS (
    SELECT
      COALESCE(SUM(unit_price), 0)::NUMERIC(12,2) AS subtotal,
      COALESCE(SUM(cgst_amount), 0)::NUMERIC(12,2) AS total_cgst,
      COALESCE(SUM(sgst_amount), 0)::NUMERIC(12,2) AS total_sgst,
      COALESCE(SUM(line_total), 0)::NUMERIC(12,2) AS grand_total
    FROM invoice_items
    WHERE invoice_id = p_invoice_id
  )
  UPDATE invoices i
  SET
    subtotal = s.subtotal,
    total_cgst = s.total_cgst,
    total_sgst = s.total_sgst,
    grand_total = s.grand_total,
    invoice_number = COALESCE(i.invoice_number, nextval('billing_invoice_number_seq')),
    financial_year = compute_financial_year(NOW()),
    status = 'paid',
    paid_at = COALESCE(i.paid_at, NOW())
  FROM sums s
  WHERE i.id = p_invoice_id
    AND i.status IN ('draft', 'payment_pending', 'paid')
  RETURNING i.id, i.invoice_number, i.financial_year, i.status, i.paid_at;
END;
$$ LANGUAGE plpgsql;
