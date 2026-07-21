import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { invoices, storeSettings, invoiceAuditLog } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import {
  formatInvoiceNumber,
  getFinancialYear,
  isInterStateTransaction,
} from "@/lib/domain/gst";
import { recalculateInvoiceTotals } from "@/lib/server/invoice-totals";
import { isValidIndianMobile, normalizeIndianPhone } from "@/lib/domain/phone";
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
      buyerName,
      buyerPhone,
      buyerEmail,
      buyerGstin,
      buyerState,
      buyerStateCode,
      paymentMode = "upi",
    } = body;

    const normalizedPhone = buyerPhone ? normalizeIndianPhone(buyerPhone) : "";
    if (buyerPhone && !isValidIndianMobile(normalizedPhone)) {
      return NextResponse.json({ error: "Invalid 10-digit mobile number" }, { status: 400 });
    }

    const inv = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (inv.status === "paid" || inv.status === "sent") {
      return NextResponse.json({ invoice: inv, alreadyFinalized: true });
    }

    // Get store settings
    let settings = await db.query.storeSettings.findFirst();
    if (!settings) {
      const [inserted] = await db
        .insert(storeSettings)
        .values({
          storeName: "DRFTN Clothing",
          legalName: "DRFTN Clothing",
          state: "Karnataka",
          stateCode: "29",
          invoicePrefix: "DRFTN",
          currentFY: "25-26",
          currentSequence: 0,
        })
        .returning();
      settings = inserted;
    }

    const sellerState = settings.state || "Karnataka";
    const targetBuyerState = buyerState || sellerState;
    const isInterState = isInterStateTransaction(sellerState, targetBuyerState);

    // Auto-increment sequence per FY
    const currentFY = settings.currentFY || getFinancialYear(new Date());
    const nextSeq = (settings.currentSequence || 0) + 1;
    const invoiceNumberStr = formatInvoiceNumber(
      settings.invoicePrefix || "DRFTN",
      currentFY,
      nextSeq
    );

    // Update settings sequence
    await db
      .update(storeSettings)
      .set({
        currentSequence: nextSeq,
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.id, settings.id));

    // Update invoice with buyer details & inter-state setting
    await db
      .update(invoices)
      .set({
        buyerName: buyerName ? String(buyerName).trim() : null,
        buyerPhone: normalizedPhone || null,
        buyerEmail: buyerEmail ? String(buyerEmail).trim() : null,
        buyerGstin: buyerGstin ? String(buyerGstin).trim().toUpperCase() : null,
        buyerState: targetBuyerState,
        buyerStateCode: buyerStateCode || (targetBuyerState === "Karnataka" ? "29" : ""),
        isInterState,
        paymentMode: paymentMode || "upi",
        invoiceNumber: invoiceNumberStr,
        sequence: nextSeq,
        financialYear: currentFY,
        status: "paid",
        paidAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    // Recalculate totals with inter-state logic
    const recalcResult = await recalculateInvoiceTotals(invoiceId);

    // Audit log
    await db.insert(invoiceAuditLog).values({
      invoiceId,
      eventType: "invoice_finalized",
      newValue: {
        invoiceNumber: invoiceNumberStr,
        buyerPhone: normalizedPhone,
        grandTotalPaise: recalcResult?.invoice?.grandTotalPaise,
        paymentMode,
      },
    });

    return NextResponse.json({
      success: true,
      invoice: recalcResult?.invoice,
      items: recalcResult?.items,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to finalize invoice";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
