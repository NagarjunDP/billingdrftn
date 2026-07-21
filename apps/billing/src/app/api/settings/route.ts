import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { storeSettings } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireUserId();
    let settings = await db.query.storeSettings.findFirst();

    if (!settings) {
      const [inserted] = await db
        .insert(storeSettings)
        .values({
          storeName: "DRFTN Clothing",
          legalName: "DRFTN Clothing",
          state: "Karnataka",
          stateCode: "29",
          invoicePrefix: "DRFTN",
          currentFY: "25-26",
          currentSequence: 0,
        })
        .returning();
      settings = inserted;
    }

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireUserId();
    const body = await request.json();

    let settings = await db.query.storeSettings.findFirst();

    if (!settings) {
      const [inserted] = await db
        .insert(storeSettings)
        .values({
          ...body,
          updatedAt: new Date(),
        })
        .returning();
      return NextResponse.json({ settings: inserted });
    }

    const [updated] = await db
      .update(storeSettings)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.id, settings.id))
      .returning();

    return NextResponse.json({ settings: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
