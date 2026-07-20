import { describe, expect, it } from "vitest";
import { computeLineTax, getGstRate } from "./gst";

describe("GST slab logic", () => {
  it("uses 5% for <=2500", () => {
    expect(getGstRate(2500)).toBe(5);
    expect(computeLineTax(2500).lineTotal).toBe(2625);
  });

  it("uses 18% above 2500", () => {
    expect(getGstRate(2500.01)).toBe(18);
    expect(computeLineTax(3000).lineTotal).toBe(3540);
  });
});
