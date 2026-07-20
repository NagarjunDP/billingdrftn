import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteInvoiceItem, updateInvoiceItemPrice } from "@/lib/repos/invoices";
import { requireUserId } from "@/lib/server/auth";

const updateSchema = z.object({
  unitPrice: z.number().positive(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ invoiceId: string; itemId: string }> }) {
  try {
    await requireUserId();
    const { unitPrice } = updateSchema.parse(await req.json());
    const { invoiceId, itemId } = await params;
    const item = await updateInvoiceItemPrice(invoiceId, itemId, unitPrice);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ invoiceId: string; itemId: string }> }) {
  try {
    await requireUserId();
    const { invoiceId, itemId } = await params;
    await deleteInvoiceItem(invoiceId, itemId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
