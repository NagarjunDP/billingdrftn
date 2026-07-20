"use client";

import { ChangeEvent, KeyboardEvent, useMemo, useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { isValidIndianMobile, normalizeIndianPhone } from "@/lib/domain/phone";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Item = { id: string; product_name: string; unit_price: string; gst_rate: string; line_total: string };
type Invoice = {
  id: string; invoice_number: number | null; status: "draft" | "payment_pending" | "paid" | "sent";
  customer_phone: string | null; customer_name: string | null;
  subtotal: string; total_cgst: string; total_sgst: string; grand_total: string;
  pdf_url: string | null; paid_at: string | null;
};
type QuickProduct = { id: string; code: string; name: string; price: string };
type Mode = "sale" | "library" | "dashboard";
type SaleStep = "landing" | "cart" | "payment" | "confirmed";

const toCurrency = (v: string | number) => `₹${Number(v).toFixed(2)}`;

/* ─── Main Component ─────────────────────────────────────────────────────── */
export function BillingApp() {
  const [mode, setMode] = useState<Mode>("sale");
  const [saleStep, setSaleStep] = useState<SaleStep>("landing");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [ocrName, setOcrName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState<"scan" | "quick" | null>(null);
  const [productCode, setProductCode] = useState("");
  const [quickProducts, setQuickProducts] = useState<QuickProduct[]>([]);
  const [suggestions, setSuggestions] = useState<QuickProduct[]>([]);
  const [newCode, setNewCode] = useState(""); const [newName, setNewName] = useState(""); const [newPrice, setNewPrice] = useState("");
  const [adminInvoices, setAdminInvoices] = useState<Invoice[]>([]);
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 8) + "01");
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [flashItem, setFlashItem] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const totals = useMemo(() => ({
    subtotal: invoice?.subtotal ?? "0", cgst: invoice?.total_cgst ?? "0",
    sgst: invoice?.total_sgst ?? "0", grand: invoice?.grand_total ?? "0",
  }), [invoice]);

  const editable = invoice?.status === "draft";

  useEffect(() => { loadQuickProducts(); }, []);

  async function loadQuickProducts() {
    try { const r = await fetch("/api/quick-products"); if (r.ok) { const d = await r.json(); setQuickProducts(d.products || []); } }
    catch { /* silent */ }
  }

  async function createNewSale() {
    setIsLoading(true);
    const r = await fetch("/api/invoices", { method: "POST" });
    const d = await r.json();
    setInvoice(d.invoice); setItems([]); setCustomerPhone(""); setCustomerName("");
    setName(""); setPrice(""); setProductCode(""); setPhotoPreview(null); setOcrName("");
    setIsLoading(false); setSaleStep("cart");
  }

  async function refreshInvoice(id: string) {
    const r = await fetch(`/api/invoices?invoiceId=${id}`);
    const d = await r.json(); setInvoice(d.invoice); setItems(d.items);
  }

  async function addItem(itemName: string) {
    if (!invoice || !price || !itemName) return;
    const r = await fetch(`/api/invoices/${invoice.id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName: itemName, unitPrice: Number(price) }),
    });
    if (r.ok) {
      const prevItems = [...items];
      await refreshInvoice(invoice.id);
      setName(""); setPrice(""); setOcrName(""); setProductCode("");
      setShowAddSheet(null); setPhotoPreview(null); setSuggestions([]);
      // Flash newest item
      const freshR = await fetch(`/api/invoices?invoiceId=${invoice.id}`);
      const freshD = await freshR.json();
      const newest = freshD.items.find((i: Item) => !prevItems.find(p => p.id === i.id));
      if (newest) { setFlashItem(newest.id); setTimeout(() => setFlashItem(null), 1200); }
    }
  }

  async function updatePrice(itemId: string, newP: string) {
    if (!invoice) return;
    await fetch(`/api/invoices/${invoice.id}/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unitPrice: Number(newP) }),
    });
    await refreshInvoice(invoice.id);
  }

  async function removeItem(itemId: string) {
    if (!invoice) return;
    await fetch(`/api/invoices/${invoice.id}/items/${itemId}`, { method: "DELETE" });
    await refreshInvoice(invoice.id);
  }

  async function handleTagScan(e: ChangeEvent<HTMLInputElement>) {
    if (!invoice) return;
    const file = e.currentTarget.files?.[0]; if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    const fd = new FormData(); fd.append("tagImage", file);
    const r = await fetch(`/api/invoices/${invoice.id}/ocr`, { method: "POST", body: fd });
    const d = await r.json(); setOcrName(d.extractedName);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }

  async function finalizePayment() {
    if (!invoice) return;
    const normalized = normalizeIndianPhone(customerPhone);
    if (!isValidIndianMobile(normalized)) { setPhoneError(true); return; }
    setPhoneError(false);
    const r = await fetch(`/api/invoices/${invoice.id}/finalize`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerPhone: normalized, customerName }),
    });
    if (!r.ok) { alert("Payment finalization failed"); return; }
    await refreshInvoice(invoice.id); setSaleStep("confirmed");
  }

  async function sendWhatsApp() {
    if (!invoice?.pdf_url || !invoice.customer_phone) return;
    await fetch(`/api/invoices/${invoice.id}/mark-sent`, { method: "POST" });
    const text = encodeURIComponent(`Your DRFTN invoice is ready: ${invoice.pdf_url}`);
    window.open(`https://wa.me/91${invoice.customer_phone}?text=${text}`, "_blank", "noopener,noreferrer");
    await refreshInvoice(invoice.id);
  }

  async function loadAdminInvoices() {
    const r = await fetch(`/api/dashboard/invoices?from=${fromDate}&to=${toDate}`);
    const d = await r.json(); setAdminInvoices(d.invoices);
  }

  async function addPurchaseLog() {
    const supplierName = prompt("Supplier name") ?? ""; const purchaseAmount = Number(prompt("Purchase amount") ?? "0"); const gstPaid = Number(prompt("GST paid") ?? "0");
    if (!supplierName) return;
    await fetch("/api/purchase-logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierName, purchaseAmount, gstPaid }) });
    alert("Purchase log saved");
  }

  const handleNameChange = useCallback((val: string) => {
    setName(val); setOcrName("");
    if (val.length > 1) setSuggestions(quickProducts.filter(p => p.name.toLowerCase().includes(val.toLowerCase()) || p.code.toLowerCase().includes(val.toLowerCase())).slice(0, 5));
    else setSuggestions([]);
  }, [quickProducts]);

  const handleCodeChange = useCallback(async (val: string) => {
    setProductCode(val);
    if (!val.trim()) return;
    try {
      const r = await fetch(`/api/quick-products?code=${encodeURIComponent(val)}`);
      if (r.ok) { const d = await r.json(); if (d.product) { setName(d.product.name); setPrice(d.product.price); setTimeout(() => priceInputRef.current?.focus(), 50); } }
    } catch { /* silent */ }
  }, []);

  const onCodeKey = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); await addItem(name || ocrName); }
  };
  const onPriceKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); void addItem(ocrName || name); }
  };

  async function handleSaveQuickProduct() {
    if (!newCode || !newName || !newPrice) { alert("All fields are required"); return; }
    const r = await fetch("/api/quick-products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: newCode.trim().toUpperCase(), name: newName.trim(), price: Number(newPrice) }) });
    if (r.ok) { setNewCode(""); setNewName(""); setNewPrice(""); await loadQuickProducts(); }
    else { const d = await r.json(); alert(`Error: ${d.error || "Failed to save"}`); }
  }

  async function handleDeleteQuickProduct(id: string) {
    if (!confirm("Delete this product code?")) return;
    const r = await fetch(`/api/quick-products/${id}`, { method: "DELETE" });
    if (r.ok) await loadQuickProducts();
  }

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="app-shell">
      {/* ── Top Nav ── */}
      <nav className="top-nav">
        <span className="brand">DRFTN</span>
        <div className="nav-tabs">
          <button className={`nav-tab ${mode === "sale" ? "active" : ""}`} onClick={() => setMode("sale")}>
            <span>🛒</span> Sale
          </button>
          <button className={`nav-tab ${mode === "library" ? "active" : ""}`} onClick={() => setMode("library")}>
            <span>📦</span> Products
          </button>
          <button className={`nav-tab ${mode === "dashboard" ? "active" : ""}`} onClick={() => { setMode("dashboard"); loadAdminInvoices(); }}>
            <span>📊</span> Dashboard
          </button>
        </div>
        <UserButton />
      </nav>

      {/* ══════════════════════════════════════════════════════════
          MODE: QUICK SALE
      ══════════════════════════════════════════════════════════ */}
      {mode === "sale" && (
        <div className="sale-mode">

          {/* ── STEP: Landing ── */}
          {saleStep === "landing" && (
            <div className="landing-step">
              <div className="landing-brand">
                <div className="landing-logo">🛍️</div>
                <h1>Billing Counter</h1>
                <p className="landing-sub">DRFTN Clothing · GST Billing</p>
              </div>
              <button className="btn-mega" onClick={createNewSale} disabled={isLoading}>
                {isLoading ? <span className="spinner" /> : <>➕ New Sale</>}
              </button>
            </div>
          )}

          {/* ── STEP: Cart ── */}
          {saleStep === "cart" && invoice && (
            <div className="cart-step">
              {/* Add buttons */}
              <div className="add-row">
                <label className="btn-add-mode" htmlFor="tag-scan-input">
                  <span>📷</span> Scan Tag
                  <input id="tag-scan-input" type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleTagScan} disabled={!editable} />
                </label>
                <button className="btn-add-mode" onClick={() => { setShowAddSheet("quick"); setTimeout(() => nameInputRef.current?.focus(), 100); }} disabled={!editable}>
                  <span>⌨️</span> Quick Add
                </button>
              </div>

              {/* Product code bar */}
              {editable && (
                <div className="code-bar">
                  <input
                    className="code-input"
                    value={productCode}
                    onChange={(e) => void handleCodeChange(e.target.value)}
                    onKeyDown={onCodeKey}
                    placeholder="Enter product code + ↵ to add instantly"
                  />
                </div>
              )}

              {/* Cart list */}
              <div className="cart-list">
                {items.length === 0 && (
                  <div className="cart-empty">
                    <div style={{ fontSize: "3rem" }}>🛒</div>
                    <p>Cart is empty — scan a tag or quick-add an item</p>
                  </div>
                )}
                {items.map((item) => (
                  <div key={item.id} className={`cart-item ${flashItem === item.id ? "flash" : ""}`}>
                    <div className="cart-item-info">
                      <span className="cart-item-name">{item.product_name}</span>
                      <span className={`gst-badge ${item.gst_rate === "5" ? "gst-5" : item.gst_rate === "12" ? "gst-12" : "gst-18"}`}>{item.gst_rate}% GST</span>
                    </div>
                    <div className="cart-item-right">
                      <input
                        className="price-inline"
                        defaultValue={item.unit_price}
                        inputMode="decimal"
                        disabled={!editable}
                        onBlur={(e) => void updatePrice(item.id, e.target.value)}
                      />
                      <span className="line-total">{toCurrency(item.line_total)}</span>
                      <button className="btn-remove" onClick={() => removeItem(item.id)} disabled={!editable}>✕</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sticky totals footer */}
              <div className="cart-footer">
                <div className="totals-row">
                  <span>Subtotal</span><span>{toCurrency(totals.subtotal)}</span>
                </div>
                <div className="totals-row muted">
                  <span>CGST</span><span>{toCurrency(totals.cgst)}</span>
                </div>
                <div className="totals-row muted">
                  <span>SGST</span><span>{toCurrency(totals.sgst)}</span>
                </div>
                <div className="totals-grand">
                  <span>Grand Total</span><span>{toCurrency(totals.grand)}</span>
                </div>
                <div className="cart-actions-row">
                  <button className="btn-ghost-sm" onClick={() => setSaleStep("landing")}>← Back</button>
                  <button className="btn-ghost-sm danger" onClick={async () => { await fetch(`/api/invoices/${invoice.id}/clear`, { method: "POST" }); await refreshInvoice(invoice.id); }} disabled={!editable || items.length === 0}>Clear</button>
                  <button className="btn-primary" onClick={() => setSaleStep("payment")} disabled={items.length === 0}>
                    Proceed to Payment →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: Payment ── */}
          {saleStep === "payment" && invoice && (
            <div className="payment-step">
              <button className="btn-ghost-sm back-btn" onClick={() => setSaleStep("cart")}>← Back to Cart</button>
              <h2 className="payment-title">Scan to Pay</h2>
              <div className="amount-due">{toCurrency(totals.grand)}</div>
              <div className="qr-wrap">
                <Image src="/upi-qr.svg" alt="UPI QR Code" width={240} height={240} className="qr-img" />
              </div>
              <div className="customer-fields">
                <input
                  className="field-lg"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name (optional)"
                />
                <input
                  className={`field-lg ${phoneError ? "field-error shake" : ""}`}
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(e.target.value); if (phoneError) setPhoneError(false); }}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Mobile number (required)"
                />
                {phoneError && <p className="field-error-msg">⚠ Enter a valid 10-digit Indian mobile number</p>}
              </div>
              <button className="btn-confirm" onClick={finalizePayment}>
                ✅ Payment Confirmed
              </button>
            </div>
          )}

          {/* ── STEP: Confirmed ── */}
          {saleStep === "confirmed" && invoice && (
            <div className="confirmed-step">
              <div className="confirmed-icon">✅</div>
              <h2 className="confirmed-title">Payment Received!</h2>
              <p className="confirmed-invoice">Invoice #{invoice.invoice_number}</p>
              <p className="confirmed-customer">{invoice.customer_name} · {invoice.customer_phone}</p>
              <div className="confirmed-actions">
                <button className="btn-whatsapp" onClick={sendWhatsApp} disabled={!invoice.pdf_url || !invoice.customer_phone}>
                  💬 Send via WhatsApp
                </button>
                {invoice.pdf_url && (
                  <a className="btn-pdf" href={invoice.pdf_url} target="_blank" rel="noreferrer">
                    🧾 View PDF
                  </a>
                )}
              </div>
              <button className="btn-new-sale-quiet" onClick={() => { setSaleStep("landing"); setInvoice(null); setItems([]); }}>
                Start New Sale
              </button>
            </div>
          )}

          {/* ── Bottom Sheet: Quick Add / Scan ── */}
          {showAddSheet && (
            <div className="sheet-backdrop" onClick={() => setShowAddSheet(null)}>
              <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="sheet-handle" />
                <h3 className="sheet-title">{showAddSheet === "scan" ? "📷 Scan Tag" : "⌨️ Quick Add"}</h3>

                {showAddSheet === "scan" && photoPreview && (
                  <div className="scan-preview">
                    <Image src={photoPreview} alt="Scanned tag" width={80} height={80} className="scan-thumb" unoptimized />
                  </div>
                )}

                <label className="field-label">Item Name</label>
                <div style={{ position: "relative" }}>
                  <input
                    ref={nameInputRef}
                    className="field-lg"
                    value={ocrName || name}
                    onChange={(e) => { ocrName ? setOcrName(e.target.value) : handleNameChange(e.target.value); }}
                    placeholder="Product name"
                    onKeyDown={(e) => e.key === "Enter" && priceInputRef.current?.focus()}
                  />
                  {suggestions.length > 0 && (
                    <div className="suggestions">
                      {suggestions.map(s => (
                        <button key={s.id} className="suggestion-item" onClick={() => { setName(s.name); setPrice(s.price); setSuggestions([]); priceInputRef.current?.focus(); }}>
                          <span className="sug-code">{s.code}</span>
                          <span className="sug-name">{s.name}</span>
                          <span className="sug-price">{toCurrency(s.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <label className="field-label">Price (₹)</label>
                <input
                  ref={priceInputRef}
                  className="field-lg"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  onKeyDown={onPriceKey}
                />

                <button
                  className="btn-primary sheet-add-btn"
                  disabled={!(price && (ocrName || name))}
                  onClick={() => void addItem(ocrName || name)}
                >
                  Add to Cart
                </button>
                <button className="btn-ghost-sm" style={{ marginTop: "0.5rem", width: "100%" }} onClick={() => { setShowAddSheet(null); setSuggestions([]); setName(""); setPrice(""); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODE: PRODUCT LIBRARY
      ══════════════════════════════════════════════════════════ */}
      {mode === "library" && (
        <div className="library-mode">
          <div className="library-header">
            <div>
              <h2 className="section-title">Product Library</h2>
              <p className="section-hint">💡 Products added here appear as quick suggestions during sales</p>
            </div>
          </div>

          {/* Add row */}
          <div className="library-add-row">
            <input className="lib-input" placeholder="CODE" value={newCode} onChange={(e) => setNewCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLInputElement)?.focus(); } }} />
            <input className="lib-input flex-grow" placeholder="Product name" value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLInputElement)?.focus(); } }} />
            <input className="lib-input" placeholder="Price" type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleSaveQuickProduct(); } }} />
            <button className="btn-primary btn-save-lib" onClick={handleSaveQuickProduct}>+ Add</button>
          </div>

          {/* Products table */}
          <div className="lib-table-wrap">
            <table className="lib-table">
              <thead>
                <tr>
                  <th>Code</th><th>Name</th><th>Price</th><th></th>
                </tr>
              </thead>
              <tbody>
                {quickProducts.length === 0 && (
                  <tr><td colSpan={4} className="lib-empty">No products yet — add one above using Tab to move between fields and Enter to save</td></tr>
                )}
                {quickProducts.map(p => (
                  <tr key={p.id} className="lib-row">
                    <td><span className="lib-code">{p.code}</span></td>
                    <td>{p.name}</td>
                    <td className="lib-price">{toCurrency(p.price)}</td>
                    <td className="lib-actions">
                      <button className="btn-delete" onClick={() => handleDeleteQuickProduct(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODE: DASHBOARD
      ══════════════════════════════════════════════════════════ */}
      {mode === "dashboard" && (
        <div className="dashboard-mode">
          <div className="library-header">
            <div>
              <h2 className="section-title">Sales Dashboard</h2>
              <p className="section-hint">Filter and export finalized invoices</p>
            </div>
            <div className="dash-actions">
              <button className="btn-ghost-sm" onClick={addPurchaseLog}>Log Purchase GST</button>
              <a className="btn-ghost-sm" href={`/api/dashboard/export.csv?from=${fromDate}&to=${toDate}`} target="_blank">⬇ CSV</a>
            </div>
          </div>

          <div className="dash-filter-row">
            <input type="date" className="lib-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input type="date" className="lib-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <button className="btn-primary" onClick={loadAdminInvoices}>Apply</button>
          </div>

          <div className="lib-table-wrap">
            <table className="lib-table">
              <thead>
                <tr><th>Date</th><th>Invoice #</th><th>Phone</th><th>Subtotal</th><th>CGST</th><th>SGST</th><th>Total</th></tr>
              </thead>
              <tbody>
                {adminInvoices.length === 0 && (
                  <tr><td colSpan={7} className="lib-empty">No invoices found for this period</td></tr>
                )}
                {adminInvoices.map(inv => (
                  <tr key={inv.id} className="lib-row">
                    <td>{inv.paid_at?.slice(0, 10)}</td>
                    <td><span className="lib-code">#{inv.invoice_number}</span></td>
                    <td>{inv.customer_phone}</td>
                    <td className="lib-price">{toCurrency(inv.subtotal)}</td>
                    <td className="lib-price">{toCurrency(inv.total_cgst)}</td>
                    <td className="lib-price">{toCurrency(inv.total_sgst)}</td>
                    <td className="lib-price"><strong>{toCurrency(inv.grand_total)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
