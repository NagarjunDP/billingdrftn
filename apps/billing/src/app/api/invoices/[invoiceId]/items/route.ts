import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { invoiceItems, invoices, quickProducts } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import { calculateLineItem, decimalToPaise, getDefaultGstRate } from "@/lib/domain/gst";
import { recalculateInvoiceTotals } from "@/lib/server/invoice-totals";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    await requireUserId();
    const { invoiceId } = await params;
    const body = await request.json();

    const {
      productName,
      code,
      unitPrice,
      unitPricePaise,
      quantity = 1,
      discountPct = 0,
      gstRate,
      hsnCode = "6203",
    } = body;

    const inv = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (inv.status !== "draft" && inv.status !== "payment_pending") {
      return NextResponse.json({ error: "Cannot modify finalized invoice" }, { status: 400 });
    }

    // Determine unit price in paise
    const priceInPaise = unitPricePaise !== undefined
      ? Number(unitPricePaise)
      : decimalToPaise(unitPrice || 0);

    // Look up product if code provided
    let productId: string | null = null;
    let finalHsn = hsnCode;
    let finalGstRate = gstRate;

    if (code) {
      const prod = await db.query.quickProducts.findFirst({
        where: eq(quickProducts.code, String(code).toUpperCase()),
      });
      if (prod) {
        productId = prod.id;
        finalHsn = prod.hsnCode || hsnCode;
        if (finalGstRate === undefined) finalGstRate = prod.gstRate;
      }
    }

    if (finalGstRate === undefined) {
      finalGstRate = getDefaultGstRate(priceInPaise);
    }

    const calc = calculateLineItem({
      unitPricePaise: priceInPaise,
      quantity: Number(quantity),
      discountPct: Number(discountPct),
      gstRateOverride: Number(finalGstRate),
      isInterState: inv.isInterState,
    });

    await db.insert(invoiceItems).values({
      invoiceId,
      productId,
      productName: String(productName).trim(),
      hsnCode: finalHsn,
      gstRate: calc.gstRate,
      quantity: calc.quantity,
      unitPricePaise: calc.unitPricePaise,
      discountPct: calc.discountPct,
      discountPaise: calc.discountPaise,
      taxableValuePaise: calc.taxableValuePaise,
      cgstPaise: calc.cgstPaise,
      sgstPaise: calc.sgstPaise,
      igstPaise: calc.igstPaise,
      lineTotalPaise: calc.lineTotalPaise,
    });

    const result = await recalculateInvoiceTotals(invoiceId);

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add item";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
