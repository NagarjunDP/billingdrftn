import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { paiseToDecimal } from "@/lib/domain/gst";

// Register fonts
Font.register({
  family: "Helvetica-Bold",
  src: "https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica-bold@1.0.4/Helvetica-Bold.ttf",
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a26",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: "#6c63ff",
    paddingBottom: 10,
    marginBottom: 12,
  },
  titleBlock: {
    flexDirection: "column",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#6c63ff",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 8,
    color: "#666666",
    marginTop: 2,
  },
  taxInvoiceHeader: {
    textAlign: "right",
  },
  taxInvoiceTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
    textTransform: "uppercase",
  },
  invNumber: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#6c63ff",
    marginTop: 3,
  },
  invDate: {
    fontSize: 8,
    color: "#666666",
    marginTop: 2,
  },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 4,
  },
  infoCol: {
    width: "48%",
  },
  infoLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#888888",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoText: {
    fontSize: 8.5,
    color: "#222222",
    marginBottom: 1.5,
  },
  table: {
    width: "100%",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a1a26",
    color: "#ffffff",
    padding: 5,
    borderRadius: 2,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRowEven: {
    backgroundColor: "#f9fafb",
  },
  colNo: { width: "5%", textAlign: "center" },
  colDesc: { width: "30%" },
  colHsn: { width: "10%", textAlign: "center" },
  colQty: { width: "7%", textAlign: "center" },
  colRate: { width: "12%", textAlign: "right" },
  colDisc: { width: "8%", textAlign: "right" },
  colTaxable: { width: "13%", textAlign: "right" },
  colGst: { width: "7%", textAlign: "center" },
  colTotal: { width: "8%", textAlign: "right" },

  totalsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 12,
  },
  hsnSummaryBox: {
    width: "55%",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 6,
  },
  hsnTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#555555",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  totalsBox: {
    width: "42%",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#fafafa",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  totalLabel: {
    fontSize: 8,
    color: "#555555",
  },
  totalVal: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#222222",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#6c63ff",
    paddingTop: 4,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#6c63ff",
  },
  grandTotalVal: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#6c63ff",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 30,
    right: 30,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: "#888888",
  },
});

export interface TaxInvoicePDFProps {
  store: {
    storeName: string;
    legalName: string;
    gstin: string;
    address: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
    phone: string;
    email: string;
    termsFooter: string;
  };
  invoice: {
    invoiceNumber: string | null;
    financialYear: string;
    createdAt: string | Date;
    buyerName?: string | null;
    buyerPhone?: string | null;
    buyerEmail?: string | null;
    buyerGstin?: string | null;
    buyerState?: string | null;
    isInterState: boolean;
    paymentMode: string;
    subtotalPaise: number;
    totalDiscountPaise: number;
    taxableValuePaise: number;
    totalCgstPaise: number;
    totalSgstPaise: number;
    totalIgstPaise: number;
    roundingPaise: number;
    grandTotalPaise: number;
  };
  items: Array<{
    productName: string;
    hsnCode: string;
    gstRate: number;
    quantity: number;
    unitPricePaise: number;
    discountPct: number;
    discountPaise: number;
    taxableValuePaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    lineTotalPaise: number;
  }>;
}

export function TaxInvoiceDocument({ store, invoice, items }: TaxInvoicePDFProps) {
  // Aggregate HSN summary
  const hsnMap: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; totalTax: number; gstRate: number }> = {};
  for (const item of items) {
    const key = `${item.hsnCode}_${item.gstRate}`;
    if (!hsnMap[key]) {
      hsnMap[key] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, gstRate: item.gstRate };
    }
    hsnMap[key].taxable += item.taxableValuePaise;
    hsnMap[key].cgst += item.cgstPaise;
    hsnMap[key].sgst += item.sgstPaise;
    hsnMap[key].igst += item.igstPaise;
    hsnMap[key].totalTax += item.cgstPaise + item.sgstPaise + item.igstPaise;
  }

  const hsnRows = Object.entries(hsnMap).map(([k, v]) => ({
    hsnCode: k.split("_")[0],
    ...v,
  }));

  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{store.storeName}</Text>
            <Text style={styles.subtitle}>{store.legalName}</Text>
            {store.address ? <Text style={styles.subtitle}>{store.address}, {store.city} {store.pincode}</Text> : null}
            <Text style={styles.subtitle}>
              GSTIN: {store.gstin || "NOT PROVIDED"} | State: {store.state} ({store.stateCode})
            </Text>
            {store.phone ? <Text style={styles.subtitle}>Ph: {store.phone} {store.email ? `| ${store.email}` : ""}</Text> : null}
          </View>
          <View style={styles.taxInvoiceHeader}>
            <Text style={styles.taxInvoiceTitle}>Tax Invoice</Text>
            <Text style={styles.invNumber}>{invoice.invoiceNumber || "DRAFT"}</Text>
            <Text style={styles.invDate}>Date: {invoiceDate}</Text>
            <Text style={styles.invDate}>FY: {invoice.financialYear}</Text>
          </View>
        </View>

        {/* Billed To / Shipping Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Billed To (Customer)</Text>
            <Text style={styles.infoText}>Name: {invoice.buyerName || "Walk-in Customer"}</Text>
            {invoice.buyerPhone ? <Text style={styles.infoText}>Mobile: +91 {invoice.buyerPhone}</Text> : null}
            {invoice.buyerEmail ? <Text style={styles.infoText}>Email: {invoice.buyerEmail}</Text> : null}
            {invoice.buyerGstin ? <Text style={styles.infoText}>GSTIN: {invoice.buyerGstin}</Text> : null}
            <Text style={styles.infoText}>State: {invoice.buyerState || store.state}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Payment Details</Text>
            <Text style={styles.infoText}>Payment Mode: {invoice.paymentMode.toUpperCase()}</Text>
            <Text style={styles.infoText}>Supply Type: {invoice.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}</Text>
            <Text style={styles.infoText}>Place of Supply: {invoice.buyerState || store.state}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNo]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>Item Description</Text>
            <Text style={[styles.th, styles.colHsn]}>HSN</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate (₹)</Text>
            <Text style={[styles.th, styles.colDisc]}>Disc</Text>
            <Text style={[styles.th, styles.colTaxable]}>Taxable (₹)</Text>
            <Text style={[styles.th, styles.colGst]}>GST%</Text>
            <Text style={[styles.th, styles.colTotal]}>Total (₹)</Text>
          </View>

          {items.map((item, index) => (
            <View
              key={index}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowEven : {}]}
            >
              <Text style={styles.colNo}>{index + 1}</Text>
              <Text style={styles.colDesc}>{item.productName}</Text>
              <Text style={styles.colHsn}>{item.hsnCode}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colRate}>{paiseToDecimal(item.unitPricePaise)}</Text>
              <Text style={styles.colDisc}>{item.discountPct ? `${item.discountPct}%` : "-"}</Text>
              <Text style={styles.colTaxable}>{paiseToDecimal(item.taxableValuePaise)}</Text>
              <Text style={styles.colGst}>{item.gstRate}%</Text>
              <Text style={styles.colTotal}>{paiseToDecimal(item.lineTotalPaise)}</Text>
            </View>
          ))}
        </View>

        {/* HSN Summary + Totals */}
        <View style={styles.totalsSection}>
          {/* HSN Table */}
          <View style={styles.hsnSummaryBox}>
            <Text style={styles.hsnTitle}>HSN / SAC Tax Summary</Text>
            <View style={{ flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#ccc", paddingBottom: 2, marginBottom: 2 }}>
              <Text style={{ width: "25%", fontSize: 6.5, fontFamily: "Helvetica-Bold" }}>HSN</Text>
              <Text style={{ width: "25%", fontSize: 6.5, fontFamily: "Helvetica-Bold", textAlign: "right" }}>Taxable</Text>
              <Text style={{ width: "25%", fontSize: 6.5, fontFamily: "Helvetica-Bold", textAlign: "right" }}>GST Rate</Text>
              <Text style={{ width: "25%", fontSize: 6.5, fontFamily: "Helvetica-Bold", textAlign: "right" }}>Tax Amt</Text>
            </View>
            {hsnRows.map((h, i) => (
              <View key={i} style={{ flexDirection: "row", paddingVertical: 1 }}>
                <Text style={{ width: "25%", fontSize: 6.5 }}>{h.hsnCode}</Text>
                <Text style={{ width: "25%", fontSize: 6.5, textAlign: "right" }}>{paiseToDecimal(h.taxable)}</Text>
                <Text style={{ width: "25%", fontSize: 6.5, textAlign: "right" }}>{h.gstRate}%</Text>
                <Text style={{ width: "25%", fontSize: 6.5, textAlign: "right" }}>{paiseToDecimal(h.totalTax)}</Text>
              </View>
            ))}
          </View>

          {/* Invoice Totals Box */}
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal Gross:</Text>
              <Text style={styles.totalVal}>₹{paiseToDecimal(invoice.subtotalPaise)}</Text>
            </View>
            {invoice.totalDiscountPaise > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount:</Text>
                <Text style={styles.totalVal}>-₹{paiseToDecimal(invoice.totalDiscountPaise)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Taxable Value:</Text>
              <Text style={styles.totalVal}>₹{paiseToDecimal(invoice.taxableValuePaise)}</Text>
            </View>
            {!invoice.isInterState ? (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>CGST Total:</Text>
                  <Text style={styles.totalVal}>₹{paiseToDecimal(invoice.totalCgstPaise)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>SGST Total:</Text>
                  <Text style={styles.totalVal}>₹{paiseToDecimal(invoice.totalSgstPaise)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IGST Total:</Text>
                <Text style={styles.totalVal}>₹{paiseToDecimal(invoice.totalIgstPaise)}</Text>
              </View>
            )}
            {invoice.roundingPaise !== 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Rounding Adj:</Text>
                <Text style={styles.totalVal}>{invoice.roundingPaise > 0 ? "+" : ""}₹{paiseToDecimal(invoice.roundingPaise)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total:</Text>
              <Text style={styles.grandTotalVal}>₹{paiseToDecimal(invoice.grandTotalPaise)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{store.termsFooter}</Text>
          <Text style={styles.footerText}>Computer Generated Tax Invoice · DRFTN Clothing</Text>
        </View>
      </Page>
    </Document>
  );
}
