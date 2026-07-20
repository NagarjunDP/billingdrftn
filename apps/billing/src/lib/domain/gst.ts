export const LOW_GST_RATE = 5;
export const HIGH_GST_RATE = 18;
export const GST_THRESHOLD = 2500;

export type GstComputation = {
  gstRate: number;
  cgst: number;
  sgst: number;
  lineTotal: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export function getGstRate(unitPrice: number): number {
  return unitPrice <= GST_THRESHOLD ? LOW_GST_RATE : HIGH_GST_RATE;
}

export function computeLineTax(unitPrice: number): GstComputation {
  const gstRate = getGstRate(unitPrice);
  const taxAmount = (unitPrice * gstRate) / 100;
  const cgst = round2(taxAmount / 2);
  const sgst = round2(taxAmount / 2);

  return {
    gstRate,
    cgst,
    sgst,
    lineTotal: round2(unitPrice + cgst + sgst),
  };
}
