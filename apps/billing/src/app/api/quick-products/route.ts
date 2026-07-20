import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/server/auth";
import {
  saveQuickProduct,
  getQuickProductByCode,
  listQuickProducts,
} from "@/lib/repos/quick-products";

const saveProductSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
});

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
    const code = req.nextUrl.searchParams.get("code");
    if (code) {
      const product = await getQuickProductByCode(code);
      return NextResponse.json({ product });
    }
    const products = await listQuickProducts();
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
    const body = saveProductSchema.parse(await req.json());
    const product = await saveQuickProduct(body.code, body.name, body.price);
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
