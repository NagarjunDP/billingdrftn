import { db } from "@/db/client";
import { invoices, invoiceItems } from "@/db/schema";
import { calculateInvoiceTotals, LineItemInput } from "@/lib/domain/gst";
import { eq } from "drizzle-orm";

export async function recalculateInvoiceTotals(invoiceId: string) {
  const inv = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });

  if (!inv) return null;

  const items = await db.query.invoiceItems.findMany({
    where: eq(invoiceItems.invoiceId, invoiceId),
  });

  const lineInputs: LineItemInput[] = items.map(item => ({
    unitPricePaise: item.unitPricePaise,
    quantity: item.quantity,
    discountPct: item.discountPct,
    gstRateOverride: item.gstRate,
    isInterState: inv.isInterState,
  }));

  const totals = calculateInvoiceTotals(lineInputs, inv.isInterState);

  const [updated] = await db
    .update(invoices)
    .set({
      subtotalPaise: totals.subtotalPaise,
      totalDiscountPaise: totals.totalDiscountPaise,
      taxableValuePaise: totals.taxableValuePaise,
      totalCgstPaise: totals.totalCgstPaise,
      totalSgstPaise: totals.totalSgstPaise,
      totalIgstPaise: totals.totalIgstPaise,
      roundingPaise: totals.roundingPaise,
      grandTotalPaise: totals.grandTotalPaise,
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  return { invoice: updated, items, totals };
}
