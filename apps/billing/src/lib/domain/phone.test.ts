import { describe, expect, it } from "vitest";
import { isValidIndianMobile, normalizeIndianPhone } from "./phone";

describe("Indian phone validation", () => {
  it("normalizes and validates 10-digit mobile", () => {
    expect(normalizeIndianPhone("+91 98765-43210")).toBe("9876543210");
    expect(isValidIndianMobile("+91 98765-43210")).toBe(true);
  });

  it("rejects invalid patterns", () => {
    expect(isValidIndianMobile("1234567890")).toBe(false);
    expect(isValidIndianMobile("987654321")).toBe(false);
  });
});
