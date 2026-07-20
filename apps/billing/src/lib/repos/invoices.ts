import { sql } from "@/db/client";
import { computeLineTax } from "@/lib/domain/gst";

const round2 = (value: number) => Math.round(value * 100) / 100;

export type InvoiceRow = {
  id: string;
  invoice_number: number | null;
  financial_year: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: string;
  total_cgst: string;
  total_sgst: string;
  grand_total: string;
  status: "draft" | "payment_pending" | "paid" | "sent";
  pdf_url: string | null;
  created_at: string;
  paid_at: string | null;
  sent_at: string | null;
};

export type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  product_name: string;
  unit_price: string;
  hsn_code: string;
  gst_rate: string;
  cgst_amount: string;
  sgst_amount: string;
  line_total: string;
  tag_photo_url: string | null;
  created_at: string;
};

export async function createDraftInvoice() {
  const [invoice] = await sql`
    INSERT INTO invoices (financial_year, status)
    VALUES ('pending', 'draft')
    RETURNING *
  `;
  return invoice as InvoiceRow;
}

export async function getInvoiceWithItems(invoiceId: string) {
  const [invoice] = await sql`SELECT * FROM invoices WHERE id = ${invoiceId}`;
  const items = await sql`SELECT * FROM invoice_items WHERE invoice_id = ${invoiceId} ORDER BY created_at ASC`;
  return {
    invoice: invoice as InvoiceRow,
    items: items as unknown as InvoiceItemRow[],
  };
}

export async function addInvoiceItem(input: {
  invoiceId: string;
  productName: string;
  unitPrice: number;
  hsnCode?: string;
  tagPhotoUrl?: string | null;
}) {
  const tax = computeLineTax(input.unitPrice);
  const [item] = await sql`
    INSERT INTO invoice_items (
      invoice_id,
      product_name,
      unit_price,
      hsn_code,
      gst_rate,
      cgst_amount,
      sgst_amount,
      line_total,
      tag_photo_url
    ) VALUES (
      ${input.invoiceId},
      ${input.productName},
      ${round2(input.unitPrice)},
      ${input.hsnCode ?? "6203"},
      ${tax.gstRate},
      ${tax.cgst},
      ${tax.sgst},
      ${tax.lineTotal},
      ${input.tagPhotoUrl ?? null}
    )
    RETURNING *
  `;

  await refreshInvoiceTotals(input.invoiceId);
  return item;
}

export async function updateInvoiceItemPrice(invoiceId: string, itemId: string, unitPrice: number) {
  const tax = computeLineTax(unitPrice);
  const [item] = await sql`
    UPDATE invoice_items
    SET
      unit_price = ${round2(unitPrice)},
      gst_rate = ${tax.gstRate},
      cgst_amount = ${tax.cgst},
      sgst_amount = ${tax.sgst},
      line_total = ${tax.lineTotal}
    WHERE id = ${itemId}
      AND invoice_id = ${invoiceId}
    RETURNING *
  `;

  await refreshInvoiceTotals(invoiceId);
  return item;
}

export async function deleteInvoiceItem(invoiceId: string, itemId: string) {
  await sql`DELETE FROM invoice_items WHERE id = ${itemId} AND invoice_id = ${invoiceId}`;
  await refreshInvoiceTotals(invoiceId);
}

export async function clearDraftItems(invoiceId: string) {
  await sql`DELETE FROM invoice_items WHERE invoice_id = ${invoiceId}`;
  await refreshInvoiceTotals(invoiceId);
}

export async function refreshInvoiceTotals(invoiceId: string) {
  await sql`
    WITH sums AS (
      SELECT
        COALESCE(SUM(unit_price), 0)::numeric(12,2) AS subtotal,
        COALESCE(SUM(cgst_amount), 0)::numeric(12,2) AS total_cgst,
        COALESCE(SUM(sgst_amount), 0)::numeric(12,2) AS total_sgst,
        COALESCE(SUM(line_total), 0)::numeric(12,2) AS grand_total
      FROM invoice_items
      WHERE invoice_id = ${invoiceId}
    )
    UPDATE invoices i
    SET
      subtotal = s.subtotal,
      total_cgst = s.total_cgst,
      total_sgst = s.total_sgst,
      grand_total = s.grand_total
    FROM sums s
    WHERE i.id = ${invoiceId}
      AND i.status IN ('draft', 'payment_pending')
  `;
}

export async function finalizeInvoicePayment(invoiceId: string, customerPhone: string, customerName?: string) {
  const [result] = await sql`
    SELECT *
    FROM finalize_invoice_payment(${invoiceId}::uuid, ${customerPhone}, ${customerName ?? ""})
  `;
  return result;
}

export async function markInvoiceSent(invoiceId: string) {
  const [invoice] = await sql`
    UPDATE invoices
    SET status = 'sent', sent_at = COALESCE(sent_at, NOW())
    WHERE id = ${invoiceId}
      AND status IN ('paid', 'sent')
    RETURNING *
  `;
  return invoice;
}

export async function listInvoices(from?: string, to?: string, query?: string) {
  const fromDate = from ?? "2000-01-01";
  const toDate = to ?? "2100-01-01";
  const search = `%${query ?? ""}%`;

  return sql`
    SELECT *
    FROM invoices
    WHERE status IN ('paid', 'sent')
      AND created_at::date BETWEEN ${fromDate}::date AND ${toDate}::date
      AND (
        ${query ?? ""} = ''
        OR customer_phone ILIKE ${search}
        OR COALESCE(customer_name, '') ILIKE ${search}
        OR COALESCE(invoice_number::text, '') ILIKE ${search}
      )
    ORDER BY created_at DESC
    LIMIT 500
  `;
}

export async function getMonthlySummary(monthStartIso: string, monthEndIso: string) {
  const [summary] = await sql`
    SELECT
      COALESCE(SUM(total_cgst + total_sgst), 0)::numeric(12,2) AS gst_collected,
      COALESCE((SELECT SUM(gst_paid) FROM purchase_logs WHERE purchase_date BETWEEN ${monthStartIso}::timestamptz AND ${monthEndIso}::timestamptz), 0)::numeric(12,2) AS gst_paid
    FROM invoices
    WHERE status IN ('paid', 'sent')
      AND paid_at BETWEEN ${monthStartIso}::timestamptz AND ${monthEndIso}::timestamptz
  `;

  return {
    gstCollected: summary?.gst_collected ?? "0.00",
    gstPaid: summary?.gst_paid ?? "0.00",
    netPayable: round2(Number(summary?.gst_collected ?? 0) - Number(summary?.gst_paid ?? 0)).toFixed(2),
  };
}

export async function createPurchaseLog(input: { supplierName: string; purchaseAmount: number; gstPaid: number }) {
  const [entry] = await sql`
    INSERT INTO purchase_logs (supplier_name, purchase_amount, gst_paid)
    VALUES (${input.supplierName}, ${round2(input.purchaseAmount)}, ${round2(input.gstPaid)})
    RETURNING *
  `;

  return entry;
}
