import { describe, expect, it } from "vitest";
import { canEditDraft, canFinalize } from "./finalization";

describe("invoice finalization constraints", () => {
  it("allows finalize only for draft/payment_pending", () => {
    expect(canFinalize("draft")).toBe(true);
    expect(canFinalize("payment_pending")).toBe(true);
    expect(canFinalize("paid")).toBe(false);
  });

  it("allows edits only in mutable statuses", () => {
    expect(canEditDraft("draft")).toBe(true);
    expect(canEditDraft("payment_pending")).toBe(true);
    expect(canEditDraft("sent")).toBe(false);
  });
});
