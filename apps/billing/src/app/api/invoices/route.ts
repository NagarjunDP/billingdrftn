import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { invoices, storeSettings } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import { getFinancialYear } from "@/lib/domain/gst";
import { desc, eq, gte, lte, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    await requireUserId();
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const status = searchParams.get("status");

    if (invoiceId) {
      const inv = await db.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
      });
      const items = await db.query.invoiceItems.findMany({
        where: eq(invoices.id, invoiceId),
      });
      return NextResponse.json({ invoice: inv, items });
    }

    const conditions = [];
    if (status) conditions.push(eq(invoices.status, status as any));
    if (fromDate) conditions.push(gte(invoices.createdAt, new Date(fromDate)));
    if (toDate) conditions.push(lte(invoices.createdAt, new Date(toDate + "T23:59:59.999Z")));

    const results = await db
      .select()
      .from(invoices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(invoices.createdAt))
      .limit(100);

    return NextResponse.json({ invoices: results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch invoices";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    await requireUserId();

    const settings = await db.query.storeSettings.findFirst();
    const currentFY = settings?.currentFY || getFinancialYear(new Date());

    const [newInvoice] = await db
      .insert(invoices)
      .values({
        financialYear: currentFY,
        status: "draft",
        buyerState: settings?.state || "Karnataka",
        buyerStateCode: settings?.stateCode || "29",
        isInterState: false,
      })
      .returning();

    return NextResponse.json({ invoice: newInvoice });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create invoice";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
