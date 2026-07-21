import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { invoices, invoiceItems, storeSettings } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import { and, eq, gte, lte, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireUserId();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7); // e.g. "2026-07"

    let fromDate: Date;
    let toDate: Date;

    if (period.includes("Q")) {
      // Quarter format: e.g. "2026-Q2"
      const [yearStr, qStr] = period.split("-Q");
      const year = parseInt(yearStr, 10);
      const q = parseInt(qStr, 10);
      const startMonth = (q - 1) * 3;
      fromDate = new Date(year, startMonth, 1);
      toDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
    } else {
      // Month format: "2026-07"
      const [yearStr, monthStr] = period.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      fromDate = new Date(year, month, 1);
      toDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    }

    const settings = await db.query.storeSettings.findFirst();

    // 1. All paid invoices in period
    const periodInvoices = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, fromDate), lte(invoices.paidAt, toDate)));

    // 2. Separate B2B (buyerGstin present) vs B2C (no GSTIN)
    const b2bInvoices = periodInvoices.filter(i => !!i.buyerGstin);
    const b2cInvoices = periodInvoices.filter(i => !i.buyerGstin);

    const b2bSummary = {
      count: b2bInvoices.length,
      taxablePaise: b2bInvoices.reduce((sum, i) => sum + i.taxableValuePaise, 0),
      cgstPaise: b2bInvoices.reduce((sum, i) => sum + i.totalCgstPaise, 0),
      sgstPaise: b2bInvoices.reduce((sum, i) => sum + i.totalSgstPaise, 0),
      igstPaise: b2bInvoices.reduce((sum, i) => sum + i.totalIgstPaise, 0),
      totalPaise: b2bInvoices.reduce((sum, i) => sum + i.grandTotalPaise, 0),
    };

    const b2cSummary = {
      count: b2cInvoices.length,
      taxablePaise: b2cInvoices.reduce((sum, i) => sum + i.taxableValuePaise, 0),
      cgstPaise: b2cInvoices.reduce((sum, i) => sum + i.totalCgstPaise, 0),
      sgstPaise: b2cInvoices.reduce((sum, i) => sum + i.totalSgstPaise, 0),
      igstPaise: b2cInvoices.reduce((sum, i) => sum + i.totalIgstPaise, 0),
      totalPaise: b2cInvoices.reduce((sum, i) => sum + i.grandTotalPaise, 0),
    };

    // 3. HSN-wise summary table
    const hsnSummary = await db
      .select({
        hsnCode: invoiceItems.hsnCode,
        gstRate: invoiceItems.gstRate,
        totalQuantity: sql<number>`SUM(${invoiceItems.quantity})`,
        taxablePaise: sql<number>`SUM(${invoiceItems.taxableValuePaise})`,
        cgstPaise: sql<number>`SUM(${invoiceItems.cgstPaise})`,
        sgstPaise: sql<number>`SUM(${invoiceItems.sgstPaise})`,
        igstPaise: sql<number>`SUM(${invoiceItems.igstPaise})`,
        totalTaxPaise: sql<number>`SUM(${invoiceItems.cgstPaise} + ${invoiceItems.sgstPaise} + ${invoiceItems.igstPaise})`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, fromDate), lte(invoices.paidAt, toDate)))
      .groupBy(invoiceItems.hsnCode, invoiceItems.gstRate);

    return NextResponse.json({
      period,
      storeSettings: settings,
      totalInvoices: periodInvoices.length,
      b2bSummary,
      b2cSummary,
      hsnSummary,
      invoices: periodInvoices,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate GSTR-1 summary";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
