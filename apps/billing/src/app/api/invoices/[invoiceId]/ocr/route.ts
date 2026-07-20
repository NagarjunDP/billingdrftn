import { NextResponse } from "next/server";
import { extractProductNameFromImage } from "@/lib/server/ocr";
import { requireUserId } from "@/lib/server/auth";
import { uploadBufferToStorage } from "@/lib/storage";

export async function POST(req: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    await requireUserId();
    const { invoiceId } = await params;
    const formData = await req.formData();
    const file = formData.get("tagImage");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "tagImage is required" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const imagePath = `tags/${invoiceId}/${Date.now()}-${file.name}`;
    const tagPhotoUrl = await uploadBufferToStorage(imagePath, bytes, file.type || "image/jpeg");
    const extractedName = await extractProductNameFromImage(file.name);

    return NextResponse.json({ extractedName, tagPhotoUrl });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
