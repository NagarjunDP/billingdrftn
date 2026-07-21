import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { invoices, invoiceItems, storeSettings } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import { gte, lte, and, eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireUserId();
    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get("from") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const toStr = searchParams.get("to") || new Date().toISOString().slice(0, 10);

    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr + "T23:59:59.999Z");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Today sales total
    const [todayAgg] = await db
      .select({
        salesPaise: sql<number>`COALESCE(SUM(${invoices.grandTotalPaise}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, todayStart)));

    // 2. Range totals (month / period)
    const [periodAgg] = await db
      .select({
        revenuePaise: sql<number>`COALESCE(SUM(${invoices.grandTotalPaise}), 0)`,
        subtotalPaise: sql<number>`COALESCE(SUM(${invoices.subtotalPaise}), 0)`,
        taxablePaise: sql<number>`COALESCE(SUM(${invoices.taxableValuePaise}), 0)`,
        totalCgstPaise: sql<number>`COALESCE(SUM(${invoices.totalCgstPaise}), 0)`,
        totalSgstPaise: sql<number>`COALESCE(SUM(${invoices.totalSgstPaise}), 0)`,
        totalIgstPaise: sql<number>`COALESCE(SUM(${invoices.totalIgstPaise}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, fromDate), lte(invoices.paidAt, toDate)));

    // 3. Daily trend data for recharts
    const dailyTrend = await db
      .select({
        date: sql<string>`TO_CHAR(${invoices.paidAt}, 'YYYY-MM-DD')`,
        salesPaise: sql<number>`COALESCE(SUM(${invoices.grandTotalPaise}), 0)`,
        taxPaise: sql<number>`COALESCE(SUM(${invoices.totalCgstPaise} + ${invoices.totalSgstPaise} + ${invoices.totalIgstPaise}), 0)`,
        invoiceCount: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, fromDate), lte(invoices.paidAt, toDate)))
      .groupBy(sql`TO_CHAR(${invoices.paidAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${invoices.paidAt}, 'YYYY-MM-DD')`);

    // 4. Top selling products
    const topProducts = await db
      .select({
        productName: invoiceItems.productName,
        totalQty: sql<number>`SUM(${invoiceItems.quantity})`,
        totalRevenuePaise: sql<number>`SUM(${invoiceItems.lineTotalPaise})`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, fromDate), lte(invoices.paidAt, toDate)))
      .groupBy(invoiceItems.productName)
      .orderBy(sql`SUM(${invoiceItems.lineTotalPaise}) DESC`)
      .limit(10);

    return NextResponse.json({
      todaySalesPaise: Number(todayAgg?.salesPaise || 0),
      todayInvoiceCount: Number(todayAgg?.count || 0),
      periodRevenuePaise: Number(periodAgg?.revenuePaise || 0),
      periodTaxablePaise: Number(periodAgg?.taxablePaise || 0),
      periodCgstPaise: Number(periodAgg?.totalCgstPaise || 0),
      periodSgstPaise: Number(periodAgg?.totalSgstPaise || 0),
      periodIgstPaise: Number(periodAgg?.totalIgstPaise || 0),
      totalGstCollectedPaise:
        Number(periodAgg?.totalCgstPaise || 0) +
        Number(periodAgg?.totalSgstPaise || 0) +
        Number(periodAgg?.totalIgstPaise || 0),
      periodInvoiceCount: Number(periodAgg?.count || 0),
      dailyTrend,
      topProducts,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch dashboard stats";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
