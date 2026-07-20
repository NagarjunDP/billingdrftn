import { addInvoiceItem, createDraftInvoice } from "@/lib/repos/invoices";

async function seed() {
  const invoice = await createDraftInvoice();
  await addInvoiceItem({ invoiceId: invoice.id, productName: "Demo Tee", unitPrice: 1499 });
  await addInvoiceItem({ invoiceId: invoice.id, productName: "Demo Jacket", unitPrice: 3299 });
  console.log(`Seeded draft invoice: ${invoice.id}`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
