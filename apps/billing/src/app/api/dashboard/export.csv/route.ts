import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { listInvoices } from "@/lib/repos/invoices";

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;
    const invoices = await listInvoices(from, to);

    const header = "invoice_number,created_at,customer_name,customer_phone,subtotal,total_cgst,total_sgst,grand_total,status";
    const rows = invoices.map((inv) => [
      inv.invoice_number,
      inv.created_at,
      inv.customer_name ?? "",
      inv.customer_phone ?? "",
      inv.subtotal,
      inv.total_cgst,
      inv.total_sgst,
      inv.grand_total,
      inv.status,
    ].join(","));

    return new NextResponse([header, ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=invoice-export-${Date.now()}.csv`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
