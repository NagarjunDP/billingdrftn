import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { invoiceItems, invoices } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import { calculateLineItem, decimalToPaise } from "@/lib/domain/gst";
import { recalculateInvoiceTotals } from "@/lib/server/invoice-totals";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string; itemId: string }> }
) {
  try {
    await requireUserId();
    const { invoiceId, itemId } = await params;
    const body = await request.json();

    const existingItem = await db.query.invoiceItems.findFirst({
      where: and(eq(invoiceItems.id, itemId), eq(invoiceItems.invoiceId, invoiceId)),
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const inv = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!inv || (inv.status !== "draft" && inv.status !== "payment_pending")) {
      return NextResponse.json({ error: "Cannot modify finalized invoice" }, { status: 400 });
    }

    const unitPricePaise = body.unitPricePaise !== undefined
      ? Number(body.unitPricePaise)
      : body.unitPrice !== undefined
        ? decimalToPaise(body.unitPrice)
        : existingItem.unitPricePaise;

    const quantity = body.quantity !== undefined ? Number(body.quantity) : existingItem.quantity;
    const discountPct = body.discountPct !== undefined ? Number(body.discountPct) : existingItem.discountPct;
    const gstRate = body.gstRate !== undefined ? Number(body.gstRate) : existingItem.gstRate;
    const hsnCode = body.hsnCode !== undefined ? String(body.hsnCode) : existingItem.hsnCode;
    const productName = body.productName !== undefined ? String(body.productName) : existingItem.productName;

    const calc = calculateLineItem({
      unitPricePaise,
      quantity,
      discountPct,
      gstRateOverride: gstRate,
      isInterState: inv.isInterState,
    });

    await db
      .update(invoiceItems)
      .set({
        productName,
        hsnCode,
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
      })
      .where(eq(invoiceItems.id, itemId));

    const result = await recalculateInvoiceTotals(invoiceId);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update item";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string; itemId: string }> }
) {
  try {
    await requireUserId();
    const { invoiceId, itemId } = await params;

    await db
      .delete(invoiceItems)
      .where(and(eq(invoiceItems.id, itemId), eq(invoiceItems.invoiceId, invoiceId)));

    const result = await recalculateInvoiceTotals(invoiceId);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete item";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
