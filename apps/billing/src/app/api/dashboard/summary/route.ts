import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { getMonthlySummary } from "@/lib/repos/invoices";

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const now = new Date();
    const monthStart = req.nextUrl.searchParams.get("monthStart") ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const monthEnd = req.nextUrl.searchParams.get("monthEnd") ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59)).toISOString();
    const summary = await getMonthlySummary(monthStart, monthEnd);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
