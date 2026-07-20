import { pgTable, uuid, text, numeric, timestamp, integer, pgEnum, jsonb } from "drizzle-orm/pg-core";

export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "payment_pending", "paid", "sent"]);

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: integer("invoice_number").unique(),
  financialYear: text("financial_year").notNull(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  totalCgst: numeric("total_cgst", { precision: 12, scale: 2 }).notNull().default("0"),
  totalSgst: numeric("total_sgst", { precision: 12, scale: 2 }).notNull().default("0"),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull().default("0"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  productName: text("product_name").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  hsnCode: text("hsn_code").notNull().default("6203"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull(),
  cgstAmount: numeric("cgst_amount", { precision: 12, scale: 2 }).notNull(),
  sgstAmount: numeric("sgst_amount", { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  tagPhotoUrl: text("tag_photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceAuditLog = pgTable("invoice_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  eventType: text("event_type").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creditNotes = pgTable("credit_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  originalInvoiceId: uuid("original_invoice_id").notNull().references(() => invoices.id),
  reason: text("reason").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseLogs = pgTable("purchase_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  supplierName: text("supplier_name").notNull(),
  purchaseAmount: numeric("purchase_amount", { precision: 12, scale: 2 }).notNull(),
  gstPaid: numeric("gst_paid", { precision: 12, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
