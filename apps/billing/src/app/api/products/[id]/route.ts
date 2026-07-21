import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { quickProducts } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUserId();
    const { id } = await params;

    await db.delete(quickProducts).where(eq(quickProducts.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
