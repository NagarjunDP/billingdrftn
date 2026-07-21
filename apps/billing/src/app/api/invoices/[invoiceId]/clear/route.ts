import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { invoiceItems, invoices } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import { recalculateInvoiceTotals } from "@/lib/server/invoice-totals";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    await requireUserId();
    const { invoiceId } = await params;

    const inv = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!inv || (inv.status !== "draft" && inv.status !== "payment_pending")) {
      return NextResponse.json({ error: "Cannot clear finalized invoice" }, { status: 400 });
    }

    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    const result = await recalculateInvoiceTotals(invoiceId);

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to clear cart";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
