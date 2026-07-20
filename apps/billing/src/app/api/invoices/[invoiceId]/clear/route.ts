import { NextResponse } from "next/server";
import { clearDraftItems } from "@/lib/repos/invoices";
import { requireUserId } from "@/lib/server/auth";

export async function POST(_: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    await requireUserId();
    const { invoiceId } = await params;
    await clearDraftItems(invoiceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
