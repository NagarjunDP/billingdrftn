import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { markInvoiceSent } from "@/lib/repos/invoices";

export async function POST(_: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    await requireUserId();
    const { invoiceId } = await params;
    const invoice = await markInvoiceSent(invoiceId);
    return NextResponse.json({ invoice });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
