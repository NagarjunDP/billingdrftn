import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { createDraftInvoice, getInvoiceWithItems } from "@/lib/repos/invoices";

export async function POST() {
  try {
    await requireUserId();
    const invoice = await createDraftInvoice();
    return NextResponse.json({ invoice });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const invoiceId = req.nextUrl.searchParams.get("invoiceId");
    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }
    const payload = await getInvoiceWithItems(invoiceId);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
