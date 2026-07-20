import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { listInvoices } from "@/lib/repos/invoices";

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;
    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const invoices = await listInvoices(from, to, q);
    return NextResponse.json({ invoices });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
