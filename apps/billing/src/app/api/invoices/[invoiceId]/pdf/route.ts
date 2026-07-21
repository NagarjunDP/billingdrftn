import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/db/client";
import { invoices, invoiceItems, storeSettings } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import { TaxInvoiceDocument } from "@/lib/pdf/tax-invoice-document";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    await requireUserId();
    const { invoiceId } = await params;

    const inv = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const items = await db.query.invoiceItems.findMany({
      where: eq(invoiceItems.invoiceId, invoiceId),
    });

    let settings = await db.query.storeSettings.findFirst();
    if (!settings) {
      settings = {
        id: "",
        storeName: "DRFTN Clothing",
        legalName: "DRFTN Clothing",
        gstin: "",
        address: "",
        city: "",
        state: "Karnataka",
        stateCode: "29",
        pincode: "",
        phone: "",
        email: "",
        invoicePrefix: "DRFTN",
        currentFY: "25-26",
        currentSequence: 0,
        termsFooter: "Thank you for shopping with DRFTN Clothing. All sales are final.",
        updatedAt: new Date(),
      };
    }

    const element = React.createElement(TaxInvoiceDocument, {
      store: settings,
      invoice: inv,
      items: items,
    });

    const pdfBuffer = await renderToBuffer(element as any);

    const filename = `${(inv.invoiceNumber || "invoice").replace(/\//g, "-")}.pdf`;

    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate PDF";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
