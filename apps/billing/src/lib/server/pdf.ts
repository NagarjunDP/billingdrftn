import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type LineItem = {
  product_name: string;
  hsn_code: string;
  unit_price: string;
  cgst_amount: string;
  sgst_amount: string;
  line_total: string;
};

type InvoicePdfInput = {
  businessName: string;
  gstin: string;
  invoiceNumber: number;
  financialYear: string;
  customerName: string | null;
  customerPhone: string;
  invoiceDateIso: string;
  subtotal: string;
  totalCgst: string;
  totalSgst: string;
  grandTotal: string;
  items: LineItem[];
};

export async function buildInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  pdf.setTitle(`Invoice ${input.invoiceNumber}`);
  const invoiceDate = new Date(input.invoiceDateIso);
  pdf.setCreationDate(invoiceDate);
  pdf.setModificationDate(invoiceDate);

  let y = 800;
  const draw = (text: string, x = 40, size = 11) => {
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
    y -= 18;
  };

  draw(input.businessName, 40, 16);
  draw(`GSTIN: ${input.gstin}`);
  draw(`Invoice No: ${input.invoiceNumber} (FY ${input.financialYear})`);
  draw(`Date: ${invoiceDate.toISOString().slice(0, 10)}`);
  draw(`Customer: ${input.customerName ?? "Walk-in"}`);
  draw(`Phone: ${input.customerPhone}`);
  y -= 8;
  draw("Items:");

  input.items.forEach((item, index) => {
    draw(`${index + 1}. ${item.product_name} | HSN ${item.hsn_code} | Taxable ${item.unit_price} | CGST ${item.cgst_amount} | SGST ${item.sgst_amount} | Total ${item.line_total}`, 40, 10);
  });

  y -= 12;
  draw(`Subtotal: ${input.subtotal}`);
  draw(`CGST: ${input.totalCgst}`);
  draw(`SGST: ${input.totalSgst}`);
  draw(`Grand Total: ${input.grandTotal}`, 40, 13);

  return pdf.save();
}
