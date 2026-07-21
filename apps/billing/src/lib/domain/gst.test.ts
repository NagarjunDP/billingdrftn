import { describe, it, expect } from "vitest";
import {
  calculateLineItem,
  calculateInvoiceTotals,
  getFinancialYear,
  formatInvoiceNumber,
  isInterStateTransaction,
  formatPaise,
  decimalToPaise,
} from "./gst";

describe("GST domain engine", () => {
  it("calculates 5% GST for item <= ₹2500 (intra-state)", () => {
    const res = calculateLineItem({
      unitPricePaise: 100000, // ₹1000
      quantity: 1,
      isInterState: false,
    });
    expect(res.gstRate).toBe(5);
    expect(res.grossAmountPaise).toBe(100000);
    expect(res.taxableValuePaise).toBe(100000);
    expect(res.cgstPaise).toBe(2500); // 2.5% = ₹25
    expect(res.sgstPaise).toBe(2500); // 2.5% = ₹25
    expect(res.igstPaise).toBe(0);
    expect(res.lineTotalPaise).toBe(105000); // ₹1050
  });

  it("calculates 18% GST for item > ₹2500 (intra-state)", () => {
    const res = calculateLineItem({
      unitPricePaise: 300000, // ₹3000
      quantity: 1,
      isInterState: false,
    });
    expect(res.gstRate).toBe(18);
    expect(res.cgstPaise).toBe(27000); // 9% = ₹270
    expect(res.sgstPaise).toBe(27000); // 9% = ₹270
    expect(res.igstPaise).toBe(0);
  });

  it("calculates IGST for inter-state transaction", () => {
    const res = calculateLineItem({
      unitPricePaise: 100000, // ₹1000
      quantity: 1,
      isInterState: true,
    });
    expect(res.cgstPaise).toBe(0);
    expect(res.sgstPaise).toBe(0);
    expect(res.igstPaise).toBe(5000); // 5% = ₹50
  });

  it("calculates invoice totals with rounding", () => {
    const totals = calculateInvoiceTotals(
      [
        { unitPricePaise: 100000, quantity: 1 }, // ₹1000 + ₹50 tax
      ],
      false
    );
    expect(totals.subtotalPaise).toBe(100000);
    expect(totals.totalCgstPaise).toBe(2500);
    expect(totals.totalSgstPaise).toBe(2500);
    expect(totals.grandTotalPaise).toBe(105000);
  });

  it("formats financial year correctly", () => {
    const dateJuly = new Date("2026-07-21");
    expect(getFinancialYear(dateJuly)).toBe("26-27");

    const dateFeb = new Date("2026-02-15");
    expect(getFinancialYear(dateFeb)).toBe("25-26");
  });

  it("formats invoice numbers", () => {
    expect(formatInvoiceNumber("DRFTN", "25-26", 1)).toBe("DRFTN/25-26/0001");
    expect(formatInvoiceNumber("DRFTN", "25-26", 42)).toBe("DRFTN/25-26/0042");
  });

  it("determines inter-state correctly", () => {
    expect(isInterStateTransaction("Karnataka", "Karnataka")).toBe(false);
    expect(isInterStateTransaction("Karnataka", "Maharashtra")).toBe(true);
  });

  it("converts decimal and paise accurately", () => {
    expect(decimalToPaise("1199.50")).toBe(119950);
    expect(formatPaise(119950)).toContain("1,199.50");
  });
});
