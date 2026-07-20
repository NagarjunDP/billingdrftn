import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addInvoiceItem } from "@/lib/repos/invoices";
import { requireUserId } from "@/lib/server/auth";

const itemSchema = z.object({
  productName: z.string().min(1),
  unitPrice: z.number().positive(),
  hsnCode: z.string().optional(),
  tagPhotoUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    await requireUserId();
    const body = itemSchema.parse(await req.json());
    const { invoiceId } = await params;
    const item = await addInvoiceItem({ invoiceId, ...body });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
