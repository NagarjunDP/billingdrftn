export type InvoiceStatus = "draft" | "payment_pending" | "paid" | "sent";

export function canEditDraft(status: InvoiceStatus): boolean {
  return status === "draft" || status === "payment_pending";
}

export function canFinalize(status: InvoiceStatus): boolean {
  return status === "draft" || status === "payment_pending";
}
