import {
  pgTable, uuid, text, bigint, timestamp, integer,
  pgEnum, jsonb, boolean, index,
} from "drizzle-orm/pg-core";

/* ─── Enums ───────────────────────────────────────────────────────────────── */
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft", "payment_pending", "paid", "sent",
]);

export const paymentModeEnum = pgEnum("payment_mode", [
  "cash", "upi", "card", "bank_transfer",
]);

/* ─── Store Settings ──────────────────────────────────────────────────────── */
export const storeSettings = pgTable("store_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeName:       text("store_name").notNull().default("DRFTN Clothing"),
  legalName:       text("legal_name").notNull().default("DRFTN Clothing"),
  gstin:           text("gstin").notNull().default(""),
  address:         text("address").notNull().default(""),
  city:            text("city").notNull().default(""),
  state:           text("state").notNull().default("Karnataka"),
  stateCode:       text("state_code").notNull().default("29"),
  pincode:         text("pincode").notNull().default(""),
  phone:           text("phone").notNull().default(""),
  email:           text("email").notNull().default(""),
  invoicePrefix:   text("invoice_prefix").notNull().default("DRFTN"),
  currentFY:       text("current_fy").notNull().default("25-26"),
  currentSequence: integer("current_sequence").notNull().default(0),
  termsFooter:     text("terms_footer").notNull().default("Thank you for shopping with DRFTN Clothing. All sales are final. GST paid as applicable."),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── Quick Products (Product Library) ───────────────────────────────────── */
export const quickProducts = pgTable(
  "quick_products",
  {
    id:          uuid("id").defaultRandom().primaryKey(),
    code:        text("code").unique().notNull(),
    name:        text("name").notNull(),
    description: text("description"),
    hsnCode:     text("hsn_code").notNull().default("6203"),
    gstRate:     integer("gst_rate").notNull().default(5), // 0, 5, 12, 18
    pricePaise:  bigint("price_paise", { mode: "number" }).notNull(), // stored in paise
    price:       text("price"), // legacy string representation
    size:        text("size"),
    category:    text("category"),
    stock:       integer("stock"),
    isActive:    boolean("is_active").notNull().default(true),
    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("quick_products_code_idx").on(t.code),
    index("quick_products_name_idx").on(t.name),
  ]
);

/* ─── Invoices ────────────────────────────────────────────────────────────── */
export const invoices = pgTable(
  "invoices",
  {
    id:            uuid("id").defaultRandom().primaryKey(),
    invoiceNumber: text("invoice_number").unique(), // e.g. "DRFTN/25-26/0001"
    financialYear: text("financial_year").notNull().default("25-26"),
    sequence:      integer("sequence"),

    // Buyer info
    buyerName:      text("buyer_name"),
    buyerPhone:     text("buyer_phone"),
    buyerEmail:     text("buyer_email"),
    buyerGstin:     text("buyer_gstin"),
    buyerState:     text("buyer_state"),
    buyerStateCode: text("buyer_state_code"),
    isInterState:   boolean("is_inter_state").notNull().default(false),

    // Payment mode
    paymentMode: text("payment_mode").notNull().default("cash"),

    // Totals in paise (integers)
    subtotalPaise:      bigint("subtotal_paise", { mode: "number" }).notNull().default(0),
    totalDiscountPaise: bigint("total_discount_paise", { mode: "number" }).notNull().default(0),
    taxableValuePaise:  bigint("taxable_value_paise", { mode: "number" }).notNull().default(0),
    totalCgstPaise:     bigint("total_cgst_paise", { mode: "number" }).notNull().default(0),
    totalSgstPaise:     bigint("total_sgst_paise", { mode: "number" }).notNull().default(0),
    totalIgstPaise:     bigint("total_igst_paise", { mode: "number" }).notNull().default(0),
    roundingPaise:      bigint("rounding_paise", { mode: "number" }).notNull().default(0),
    grandTotalPaise:    bigint("grand_total_paise", { mode: "number" }).notNull().default(0),

    status: invoiceStatusEnum("status").notNull().default("draft"),
    notes:  text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt:    timestamp("paid_at",    { withTimezone: true }),
  },
  (t) => [
    index("invoices_status_idx").on(t.status),
    index("invoices_created_at_idx").on(t.createdAt),
    index("invoices_financial_year_idx").on(t.financialYear),
  ]
);

/* ─── Invoice Items ───────────────────────────────────────────────────────── */
export const invoiceItems = pgTable(
  "invoice_items",
  {
    id:        uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => quickProducts.id),

    productName: text("product_name").notNull(),
    hsnCode:     text("hsn_code").notNull().default("6203"),
    gstRate:     integer("gst_rate").notNull().default(5),
    quantity:    integer("quantity").notNull().default(1),

    // Money in paise
    unitPricePaise:    bigint("unit_price_paise", { mode: "number" }).notNull(),
    discountPct:       integer("discount_pct").notNull().default(0),
    discountPaise:     bigint("discount_paise", { mode: "number" }).notNull().default(0),
    taxableValuePaise: bigint("taxable_value_paise", { mode: "number" }).notNull(),
    cgstPaise:         bigint("cgst_paise", { mode: "number" }).notNull().default(0),
    sgstPaise:         bigint("sgst_paise", { mode: "number" }).notNull().default(0),
    igstPaise:         bigint("igst_paise", { mode: "number" }).notNull().default(0),
    lineTotalPaise:    bigint("line_total_paise", { mode: "number" }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("invoice_items_invoice_id_idx").on(t.invoiceId),
  ]
);

/* ─── Invoice Audit Log ───────────────────────────────────────────────────── */
export const invoiceAuditLog = pgTable("invoice_audit_log", {
  id:        uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  oldValue:  jsonb("old_value"),
  newValue:  jsonb("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── Credit Notes ────────────────────────────────────────────────────────── */
export const creditNotes = pgTable("credit_notes", {
  id:                uuid("id").defaultRandom().primaryKey(),
  originalInvoiceId: uuid("original_invoice_id").notNull().references(() => invoices.id),
  reason:            text("reason").notNull(),
  amountPaise:       bigint("amount_paise", { mode: "number" }).notNull(),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── Purchase Logs ───────────────────────────────────────────────────────── */
export const purchaseLogs = pgTable("purchase_logs", {
  id:                    uuid("id").defaultRandom().primaryKey(),
  supplierName:          text("supplier_name").notNull(),
  supplierGstin:         text("supplier_gstin"),
  invoiceRef:            text("invoice_ref"),
  purchaseAmountPaise:   bigint("purchase_amount_paise", { mode: "number" }).notNull(),
  gstPaidPaise:          bigint("gst_paid_paise", { mode: "number" }).notNull(),
  purchaseDate:          timestamp("purchase_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt:             timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── GST Filing Exports ─────────────────────────────────────────────────── */
export const gstFilingExports = pgTable("gst_filing_exports", {
  id:         uuid("id").defaultRandom().primaryKey(),
  period:     text("period").notNull(),
  exportType: text("export_type").notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ─── Types ───────────────────────────────────────────────────────────────── */
export type StoreSettings = typeof storeSettings.$inferSelect;
export type QuickProduct  = typeof quickProducts.$inferSelect;
export type Invoice       = typeof invoices.$inferSelect;
export type InvoiceItem   = typeof invoiceItems.$inferSelect;
export type CreditNote    = typeof creditNotes.$inferSelect;
export type PurchaseLog   = typeof purchaseLogs.$inferSelect;
