import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/server/auth";
import { createPurchaseLog } from "@/lib/repos/invoices";

const purchaseSchema = z.object({
  supplierName: z.string().min(1),
  purchaseAmount: z.number().nonnegative(),
  gstPaid: z.number().nonnegative(),
});

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
    const data = purchaseSchema.parse(await req.json());
    const log = await createPurchaseLog(data);
    return NextResponse.json({ log });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
