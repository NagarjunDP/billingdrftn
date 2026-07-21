import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { invoices, invoiceItems, storeSettings } from "@/db/schema";
import { requireUserId } from "@/lib/server/auth";
import { paiseToDecimal } from "@/lib/domain/gst";
import { and, eq, gte, lte } from "drizzle-orm";
import * as utils from "xlsx";

export async function GET(request: Request) {
  try {
    await requireUserId();
    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get("from") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const toStr = searchParams.get("to") || new Date().toISOString().slice(0, 10);
    const formatType = searchParams.get("format") || "csv"; // "csv" or "xlsx"

    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr + "T23:59:59.999Z");

    const invoiceList = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, fromDate), lte(invoices.paidAt, toDate)));

    const rows = invoiceList.map((inv, idx) => ({
      "Sl No": idx + 1,
      "Invoice Number": inv.invoiceNumber || "",
      "Financial Year": inv.financialYear,
      "Date": inv.paidAt ? new Date(inv.paidAt).toISOString().slice(0, 10) : "",
      "Buyer Name": inv.buyerName || "Walk-in",
      "Buyer Phone": inv.buyerPhone || "",
      "Buyer GSTIN": inv.buyerGstin || "B2C",
      "Place of Supply": inv.buyerState || "Karnataka",
      "Supply Type": inv.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)",
      "Payment Mode": (inv.paymentMode || "cash").toUpperCase(),
      "Taxable Value (INR)": paiseToDecimal(inv.taxableValuePaise),
      "CGST (INR)": paiseToDecimal(inv.totalCgstPaise),
      "SGST (INR)": paiseToDecimal(inv.totalSgstPaise),
      "IGST (INR)": paiseToDecimal(inv.totalIgstPaise),
      "Rounding Adj (INR)": paiseToDecimal(inv.roundingPaise),
      "Grand Total (INR)": paiseToDecimal(inv.grandTotalPaise),
    }));

    const worksheet = utils.utils.json_to_sheet(rows);
    const workbook = utils.utils.book_new();
    utils.utils.book_append_sheet(workbook, worksheet, "GST_Invoice_Register");

    if (formatType === "xlsx") {
      const buffer = utils.write(workbook, { type: "buffer", bookType: "xlsx" });
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="DRFTN_GST_Register_${fromStr}_to_${toStr}.xlsx"`,
        },
      });
    }

    // Default CSV
    const csvContent = utils.utils.sheet_to_csv(worksheet);
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="DRFTN_GST_Register_${fromStr}_to_${toStr}.csv"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
