import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/server/auth";
import { buildInvoicePdf } from "@/lib/server/pdf";
import { uploadBufferToStorage } from "@/lib/storage";
import { finalizeInvoicePayment, getInvoiceWithItems } from "@/lib/repos/invoices";
import { isValidIndianMobile, normalizeIndianPhone } from "@/lib/domain/phone";
import { sql } from "@/db/client";

const finalizeSchema = z.object({
  customerPhone: z.string().min(10),
  customerName: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    await requireUserId();
    const { invoiceId } = await params;
    const body = finalizeSchema.parse(await req.json());
    const customerPhone = normalizeIndianPhone(body.customerPhone);

    if (!isValidIndianMobile(customerPhone)) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const finalized = await finalizeInvoicePayment(invoiceId, customerPhone, body.customerName);
    const { invoice, items } = await getInvoiceWithItems(invoiceId);

    const pdfBytes = await buildInvoicePdf({
      businessName: process.env.BUSINESS_NAME ?? "DRFTN Clothing",
      gstin: process.env.BUSINESS_GSTIN ?? "GSTIN_PENDING",
      invoiceNumber: finalized.invoice_number,
      financialYear: finalized.financial_year,
      customerName: invoice.customer_name,
      customerPhone,
      invoiceDateIso: finalized.paid_at,
      subtotal: invoice.subtotal,
      totalCgst: invoice.total_cgst,
      totalSgst: invoice.total_sgst,
      grandTotal: invoice.grand_total,
      items,
    });

    const pdfPath = `invoices/${finalized.financial_year}/${finalized.invoice_number}.pdf`;
    const pdfUrl = await uploadBufferToStorage(pdfPath, pdfBytes, "application/pdf");

    await sql`UPDATE invoices SET pdf_url = ${pdfUrl} WHERE id = ${invoiceId}`;
    return NextResponse.json({ ok: true, invoiceNumber: finalized.invoice_number, pdfUrl });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
