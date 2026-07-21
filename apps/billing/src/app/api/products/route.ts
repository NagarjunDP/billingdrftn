import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { quickProducts } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import { ilike, or, eq } from "drizzle-orm";
import { decimalToPaise } from "@/lib/domain/gst";

export async function GET(request: Request) {
  try {
    await requireUserId();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const code = searchParams.get("code");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (code) {
      const prod = await db.query.quickProducts.findFirst({
        where: eq(quickProducts.code, code.toUpperCase()),
      });
      return NextResponse.json({ product: prod ?? null });
    }

    if (query) {
      const prods = await db
        .select()
        .from(quickProducts)
        .where(
          or(
            ilike(quickProducts.name, `%${query}%`),
            ilike(quickProducts.code, `%${query}%`)
          )
        )
        .limit(limit);
      return NextResponse.json({ products: prods });
    }

    const allProds = await db.select().from(quickProducts).limit(limit);
    return NextResponse.json({ products: allProds });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireUserId();
    const body = await request.json();
    const { code, name, price, pricePaise, hsnCode, gstRate, size, category, stock } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
    }

    const calculatedPricePaise = pricePaise !== undefined
      ? pricePaise
      : decimalToPaise(price || "0");

    const cleanCode = String(code).trim().toUpperCase();

    // Check if code exists -> update or insert
    const existing = await db.query.quickProducts.findFirst({
      where: eq(quickProducts.code, cleanCode),
    });

    if (existing) {
      const [updated] = await db
        .update(quickProducts)
        .set({
          name: String(name).trim(),
          pricePaise: calculatedPricePaise,
          price: (calculatedPricePaise / 100).toFixed(2),
          hsnCode: hsnCode ? String(hsnCode).trim() : existing.hsnCode,
          gstRate: gstRate !== undefined ? Number(gstRate) : existing.gstRate,
          size: size ?? existing.size,
          category: category ?? existing.category,
          stock: stock !== undefined ? Number(stock) : existing.stock,
          updatedAt: new Date(),
        })
        .where(eq(quickProducts.id, existing.id))
        .returning();

      return NextResponse.json({ product: updated, action: "updated" });
    }

    const [created] = await db
      .insert(quickProducts)
      .values({
        code: cleanCode,
        name: String(name).trim(),
        pricePaise: calculatedPricePaise,
        price: (calculatedPricePaise / 100).toFixed(2),
        hsnCode: hsnCode ? String(hsnCode).trim() : "6203",
        gstRate: gstRate !== undefined ? Number(gstRate) : 5,
        size: size || null,
        category: category || null,
        stock: stock !== undefined ? Number(stock) : null,
      })
      .returning();

    return NextResponse.json({ product: created, action: "created" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
