/**
 * DRFTN GST Calculation Engine (Paise-based Integer Math)
 * 
 * Rules:
 * 1. All money values in integer paise (₹1.00 = 100 paise, ₹2,500.00 = 250,000 paise).
 * 2. Default GST rate threshold for clothing: ₹2,500 (250,000 paise).
 *    - ≤ ₹2,500: 5% GST
 *    - > ₹2,500: 12% or 18% GST (default 18% or product master override)
 * 3. Intra-state (same state as seller): CGST (half) + SGST (half)
 * 4. Inter-state (different state): IGST (full)
 * 5. Rounding: round grand total to nearest rupee (nearest 100 paise).
 */

export const DEFAULT_GST_THRESHOLD_PAISE = 250000; // ₹2,500
export const DEFAULT_LOW_GST_RATE = 5;
export const DEFAULT_HIGH_GST_RATE = 18;

export interface LineItemInput {
  unitPricePaise: number;
  quantity: number;
  discountPct?: number; // 0 to 100
  gstRateOverride?: number; // 0, 5, 12, 18
  isInterState?: boolean;
}

export interface LineItemOutput {
  quantity: number;
  unitPricePaise: number;
  grossAmountPaise: number;
  discountPct: number;
  discountPaise: number;
  taxableValuePaise: number;
  gstRate: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  lineTotalPaise: number;
}

export interface InvoiceTotalsInput {
  items: LineItemInput[];
  isInterState: boolean;
}

export interface InvoiceTotalsOutput {
  subtotalPaise: number;
  totalDiscountPaise: number;
  taxableValuePaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalIgstPaise: number;
  totalTaxPaise: number;
  unroundedGrandTotalPaise: number;
  roundingPaise: number; // positive or negative adjustment in paise
  grandTotalPaise: number; // exact integer paise ending in 00
}

/**
 * Determine default GST rate based on unit price threshold
 */
export function getDefaultGstRate(unitPricePaise: number): number {
  return unitPricePaise <= DEFAULT_GST_THRESHOLD_PAISE
    ? DEFAULT_LOW_GST_RATE
    : DEFAULT_HIGH_GST_RATE;
}

/**
 * Calculate line item tax breakdown
 */
export function calculateLineItem(input: LineItemInput): LineItemOutput {
  const quantity = Math.max(1, Math.floor(input.quantity));
  const unitPricePaise = Math.max(0, Math.round(input.unitPricePaise));
  const grossAmountPaise = unitPricePaise * quantity;

  const discountPct = Math.min(100, Math.max(0, input.discountPct ?? 0));
  const discountPaise = Math.round((grossAmountPaise * discountPct) / 100);

  const taxableValuePaise = Math.max(0, grossAmountPaise - discountPaise);

  const gstRate = input.gstRateOverride ?? getDefaultGstRate(unitPricePaise);
  const isInterState = input.isInterState ?? false;

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (gstRate > 0) {
    const totalTax = Math.round((taxableValuePaise * gstRate) / 100);
    if (isInterState) {
      igstPaise = totalTax;
    } else {
      // Split evenly, round CGST and put remainder in SGST
      cgstPaise = Math.floor(totalTax / 2);
      sgstPaise = totalTax - cgstPaise;
    }
  }

  const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;
  const lineTotalPaise = taxableValuePaise + totalTaxPaise;

  return {
    quantity,
    unitPricePaise,
    grossAmountPaise,
    discountPct,
    discountPaise,
    taxableValuePaise,
    gstRate,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalTaxPaise,
    lineTotalPaise,
  };
}

/**
 * Calculate totals across all line items with rounding to nearest rupee
 */
export function calculateInvoiceTotals(
  items: LineItemInput[],
  isInterState: boolean = false
): InvoiceTotalsOutput {
  let subtotalPaise = 0;
  let totalDiscountPaise = 0;
  let taxableValuePaise = 0;
  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalIgstPaise = 0;

  for (const item of items) {
    const calc = calculateLineItem({ ...item, isInterState });
    subtotalPaise += calc.grossAmountPaise;
    totalDiscountPaise += calc.discountPaise;
    taxableValuePaise += calc.taxableValuePaise;
    totalCgstPaise += calc.cgstPaise;
    totalSgstPaise += calc.sgstPaise;
    totalIgstPaise += calc.igstPaise;
  }

  const totalTaxPaise = totalCgstPaise + totalSgstPaise + totalIgstPaise;
  const unroundedGrandTotalPaise = taxableValuePaise + totalTaxPaise;

  // Round to nearest 100 paise (₹1)
  const remainder = unroundedGrandTotalPaise % 100;
  let roundingPaise = 0;

  if (remainder >= 50) {
    roundingPaise = 100 - remainder; // round up
  } else if (remainder > 0) {
    roundingPaise = -remainder; // round down
  }

  const grandTotalPaise = unroundedGrandTotalPaise + roundingPaise;

  return {
    subtotalPaise,
    totalDiscountPaise,
    taxableValuePaise,
    totalCgstPaise,
    totalSgstPaise,
    totalIgstPaise,
    totalTaxPaise,
    unroundedGrandTotalPaise,
    roundingPaise,
    grandTotalPaise,
  };
}

/**
 * Determine financial year string for Indian tax system (April to March)
 * e.g., Date 2026-07-21 => FY "26-27"
 *       Date 2026-02-15 => FY "25-26"
 */
export function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() + 1; // 1 to 12
  const fullYear = date.getFullYear();

  let startYear: number;
  if (month >= 4) {
    startYear = fullYear;
  } else {
    startYear = fullYear - 1;
  }

  const endYear = startYear + 1;
  const startYY = String(startYear).slice(-2);
  const endYY = String(endYear).slice(-2);

  return `${startYY}-${endYY}`;
}

/**
 * Format invoice number per FY
 * e.g., ("DRFTN", "25-26", 1) => "DRFTN/25-26/0001"
 */
export function formatInvoiceNumber(
  prefix: string,
  fy: string,
  seq: number
): string {
  const paddedSeq = String(seq).padStart(4, "0");
  const cleanPrefix = prefix.trim().toUpperCase() || "DRFTN";
  return `${cleanPrefix}/${fy}/${paddedSeq}`;
}

/**
 * Determine if transaction is inter-state
 */
export function isInterStateTransaction(
  sellerState: string,
  buyerState: string
): boolean {
  if (!sellerState || !buyerState) return false;
  return (
    sellerState.trim().toLowerCase() !== buyerState.trim().toLowerCase()
  );
}

/**
 * Format paise integer to formatted INR currency string
 * e.g., 119900 => "₹1,199.00"
 */
export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format paise integer to decimal string without currency symbol
 * e.g., 119900 => "1199.00"
 */
export function paiseToDecimal(paise: number): string {
  return (paise / 100).toFixed(2);
}

/**
 * Convert user input decimal string to paise integer
 * e.g., "1199.00" or "1199" => 119900
 */
export function decimalToPaise(decimalStr: string | number): number {
  const val = typeof decimalStr === "number" ? decimalStr : parseFloat(decimalStr);
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

/**
 * Legacy compatibility helpers
 */
export function computeLineTax(unitPrice: number) {
  const paise = Math.round(unitPrice * 100);
  const calc = calculateLineItem({ unitPricePaise: paise, quantity: 1 });
  return {
    gstRate: calc.gstRate,
    cgst: calc.cgstPaise / 100,
    sgst: calc.sgstPaise / 100,
    lineTotal: calc.lineTotalPaise / 100,
  };
}

export function getGstRate(unitPrice: number): number {
  return getDefaultGstRate(Math.round(unitPrice * 100));
}

