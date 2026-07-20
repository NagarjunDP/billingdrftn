"use client";

import { ChangeEvent, KeyboardEvent, useMemo, useRef, useState, useEffect } from "react";
import Image from "next/image";
import { isValidIndianMobile, normalizeIndianPhone } from "@/lib/domain/phone";

type Item = {
  id: string;
  product_name: string;
  unit_price: string;
  gst_rate: string;
  line_total: string;
};

type Invoice = {
  id: string;
  invoice_number: number | null;
  status: "draft" | "payment_pending" | "paid" | "sent";
  customer_phone: string | null;
  customer_name: string | null;
  subtotal: string;
  total_cgst: string;
  total_sgst: string;
  grand_total: string;
  pdf_url: string | null;
  paid_at: string | null;
};

const toCurrency = (value: string | number) => `₹${Number(value).toFixed(2)}`;

export function BillingApp() {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [ocrName, setOcrName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [adminInvoices, setAdminInvoices] = useState<Invoice[]>([]);
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 8) + "01");
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Predefined Product Code states
  const [productCode, setProductCode] = useState("");
  type QuickProduct = {
    id: string;
    code: string;
    name: string;
    price: string;
  };
  const [quickProducts, setQuickProducts] = useState<QuickProduct[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const editable = invoice?.status === "draft";

  const totals = useMemo(
    () => ({
      subtotal: invoice?.subtotal ?? "0",
      cgst: invoice?.total_cgst ?? "0",
      sgst: invoice?.total_sgst ?? "0",
      grand: invoice?.grand_total ?? "0",
    }),
    [invoice],
  );

  async function createNewSale() {
    setIsLoading(true);
    const res = await fetch("/api/invoices", { method: "POST" });
    const data = await res.json();
    setInvoice(data.invoice);
    setItems([]);
    setCustomerPhone("");
    setCustomerName("");
    setName("");
    setPrice("");
    setProductCode("");
    setPhotoPreview(null);
    setOcrName("");
    setIsLoading(false);
    nameInputRef.current?.focus();
  }

  async function refreshInvoice(currentId: string) {
    const res = await fetch(`/api/invoices?invoiceId=${currentId}`);
    const data = await res.json();
    setInvoice(data.invoice);
    setItems(data.items);
  }

  async function addItem(overrideName?: string) {
    if (!invoice || !price || !(overrideName ?? name)) return;
    const res = await fetch(`/api/invoices/${invoice.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName: overrideName ?? name, unitPrice: Number(price) }),
    });
    if (res.ok) {
      await refreshInvoice(invoice.id);
      setName("");
      setPrice("");
      setOcrName("");
      setProductCode("");
      nameInputRef.current?.focus();
    }
  }

  // Predefined Product Codes Database operations
  useEffect(() => {
    loadQuickProducts();
  }, []);

  async function loadQuickProducts() {
    try {
      const res = await fetch("/api/quick-products");
      if (res.ok) {
        const data = await res.json();
        setQuickProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to load quick products", err);
    }
  }

  async function handleProductCodeChange(code: string) {
    setProductCode(code);
    if (!code.trim()) return;
    try {
      const res = await fetch(`/api/quick-products?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.product) {
          setName(data.product.name);
          setPrice(data.product.price);
          setOcrName("");
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveQuickProduct() {
    if (!newCode || !newName || !newPrice) {
      alert("All fields are required");
      return;
    }
    try {
      const res = await fetch("/api/quick-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          name: newName.trim(),
          price: Number(newPrice),
        }),
      });
      if (res.ok) {
        setNewCode("");
        setNewName("");
        setNewPrice("");
        await loadQuickProducts();
        alert("Product code saved/updated successfully!");
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "Failed to save"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving product code");
    }
  }

  async function handleDeleteQuickProduct(id: string) {
    if (!confirm("Are you sure you want to delete this product code?")) return;
    try {
      const res = await fetch(`/api/quick-products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadQuickProducts();
      } else {
        alert("Failed to delete product code");
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function addQuickItem(prodName: string, prodPrice: string) {
    if (!invoice || !prodPrice || !prodName) return;
    const res = await fetch(`/api/invoices/${invoice.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName: prodName, unitPrice: Number(prodPrice) }),
    });
    if (res.ok) {
      await refreshInvoice(invoice.id);
      setName("");
      setPrice("");
      setOcrName("");
      setProductCode("");
      nameInputRef.current?.focus();
    }
  }

  async function updatePrice(itemId: string, newPrice: string) {
    if (!invoice) return;
    await fetch(`/api/invoices/${invoice.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitPrice: Number(newPrice) }),
    });
    await refreshInvoice(invoice.id);
  }

  async function removeItem(itemId: string) {
    if (!invoice) return;
    await fetch(`/api/invoices/${invoice.id}/items/${itemId}`, { method: "DELETE" });
    await refreshInvoice(invoice.id);
  }

  async function clearCart() {
    if (!invoice) return;
    await fetch(`/api/invoices/${invoice.id}/clear`, { method: "POST" });
    await refreshInvoice(invoice.id);
  }

  async function handleTagScan(event: ChangeEvent<HTMLInputElement>) {
    if (!invoice) return;
    const file = (event.currentTarget.files ?? [])[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append("tagImage", file);
    const res = await fetch(`/api/invoices/${invoice.id}/ocr`, { method: "POST", body: formData });
    const data = await res.json();
    setOcrName(data.extractedName);
  }

  async function finalizePayment() {
    if (!invoice) return;
    const normalizedPhone = normalizeIndianPhone(customerPhone);
    if (!isValidIndianMobile(normalizedPhone)) {
      alert("Enter a valid 10-digit Indian mobile number");
      return;
    }

    const res = await fetch(`/api/invoices/${invoice.id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerPhone: normalizedPhone, customerName }),
    });

    if (!res.ok) {
      alert("Payment finalization failed");
      return;
    }

    await refreshInvoice(invoice.id);
  }

  async function sendWhatsApp() {
    if (!invoice?.pdf_url || !invoice.customer_phone) return;
    await fetch(`/api/invoices/${invoice.id}/mark-sent`, { method: "POST" });
    const text = encodeURIComponent(`Your DRFTN invoice is ready: ${invoice.pdf_url}`);
    window.open(`https://wa.me/91${invoice.customer_phone}?text=${text}`, "_blank", "noopener,noreferrer");
    await refreshInvoice(invoice.id);
  }

  async function loadAdminInvoices() {
    const res = await fetch(`/api/dashboard/invoices?from=${fromDate}&to=${toDate}`);
    const data = await res.json();
    setAdminInvoices(data.invoices);
  }

  async function addPurchaseLog() {
    const supplierName = prompt("Supplier name") ?? "";
    const purchaseAmount = Number(prompt("Purchase amount") ?? "0");
    const gstPaid = Number(prompt("GST paid") ?? "0");
    if (!supplierName) return;
    await fetch("/api/purchase-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierName, purchaseAmount, gstPaid }),
    });
    alert("Purchase log saved");
  }

  const onPriceKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void addItem(ocrName || name);
    }
  };

  const onCodeKey = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const trimmedCode = productCode.trim();
      if (trimmedCode) {
        try {
          const res = await fetch(`/api/quick-products?code=${encodeURIComponent(trimmedCode)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.product) {
              await addQuickItem(data.product.name, data.product.price);
            } else {
              alert("Product code not found");
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  return (
    <main className="page">
      <h1>DRFTN Billing Counter</h1>
      <div className="actions">
        <button onClick={createNewSale} disabled={isLoading}>New Sale</button>
        <button onClick={loadAdminInvoices}>Refresh Admin List</button>
        <button onClick={addPurchaseLog}>Log Purchase GST</button>
        <a href={`/api/dashboard/export.csv?from=${fromDate}&to=${toDate}`} target="_blank">Download CSV</a>
      </div>

      {!invoice ? (
        <p>Create a new sale to start billing.</p>
      ) : (
        <section className="grid">
          <div className="card">
            <h2>Draft Sale</h2>
            <p>Status: <strong>{invoice.status}</strong></p>
            <p>Invoice #: <strong>{invoice.invoice_number ?? "Not assigned"}</strong></p>

            <label>Scan Tag
              <input type="file" accept="image/*" capture="environment" onChange={handleTagScan} disabled={!editable} />
            </label>
            {photoPreview && <Image src={photoPreview} alt="Tag preview" className="thumb" width={140} height={140} unoptimized />}

            <label>Product Code (Autocomplete / Quick Enter)</label>
            <input
              value={productCode}
              onChange={(e) => void handleProductCodeChange(e.target.value)}
              onKeyDown={onCodeKey}
              placeholder="Enter code (e.g. TSHIRT1) + Press Enter"
              disabled={!editable}
            />

            <label>Item Name</label>
            <input
              ref={nameInputRef}
              value={ocrName || name}
              onChange={(e) => (ocrName ? setOcrName(e.target.value) : setName(e.target.value))}
              placeholder="Editable OCR/manual name"
              disabled={!editable}
            />

            <label>Price</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" autoFocus placeholder="0.00" onKeyDown={onPriceKey} disabled={!editable} />

            <div className="actions">
              <button onClick={() => addItem(ocrName || name)} disabled={!editable}>Add Item</button>
              <button onClick={clearCart} disabled={!editable}>Clear Cart</button>
            </div>
          </div>

          <div className="card">
            <h2>Live Cart</h2>
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <span>{item.product_name} ({item.gst_rate}% GST)</span>
                  <input
                    defaultValue={item.unit_price}
                    inputMode="decimal"
                    disabled={!editable}
                    onBlur={(e) => void updatePrice(item.id, e.target.value)}
                  />
                  <span>{toCurrency(item.line_total)}</span>
                  <button onClick={() => removeItem(item.id)} disabled={!editable}>Delete</button>
                </li>
              ))}
            </ul>
            <p>Subtotal: {toCurrency(totals.subtotal)}</p>
            <p>CGST: {toCurrency(totals.cgst)}</p>
            <p>SGST: {toCurrency(totals.sgst)}</p>
            <p><strong>Grand Total: {toCurrency(totals.grand)}</strong></p>
          </div>

          <div className="card">
            <h2>Payment</h2>
            <label>Customer Name</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={!editable} />
            <label>Customer Phone (required)</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} inputMode="numeric" maxLength={10} disabled={!editable} />
            <Image src="/upi-qr.svg" alt="Merchant UPI QR" className="qr" width={220} height={220} />
            <button onClick={finalizePayment} disabled={!editable}>Payment Confirmed</button>
            {invoice.pdf_url && <a href={invoice.pdf_url} target="_blank" rel="noreferrer">Download Invoice PDF</a>}
            <button onClick={sendWhatsApp} disabled={!invoice.pdf_url || !invoice.customer_phone}>Send via WhatsApp</button>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Finalized Invoices</h2>
        <div className="actions">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button onClick={loadAdminInvoices}>Apply Filters</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>No</th>
              <th>Phone</th>
              <th>Subtotal</th>
              <th>CGST</th>
              <th>SGST</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {adminInvoices.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.paid_at?.slice(0, 10)}</td>
                <td>{entry.invoice_number}</td>
                <td>{entry.customer_phone}</td>
                <td>{entry.subtotal}</td>
                <td>{entry.total_cgst}</td>
                <td>{entry.total_sgst}</td>
                <td>{entry.grand_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ marginTop: "20px" }}>
        <h2>Manage Predefined Product Codes</h2>
        <p style={{ color: "#666", marginBottom: "15px", fontSize: "0.95em" }}>
          Define product codes, names, and prices here when you have free time. Typing these codes in the billing interface above will instantly populate the items.
        </p>
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          <input
            placeholder="Code (e.g. TSHIRT1)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            style={{ flex: "1 1 150px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <input
            placeholder="Product Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: "2 1 250px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <input
            placeholder="Price"
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            style={{ flex: "1 1 100px", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          <button 
            onClick={handleSaveQuickProduct} 
            style={{ padding: "8px 16px", background: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
          >
            Save Code
          </button>
        </div>

        <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #eee", borderRadius: "4px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "10px", borderBottom: "1px solid #eee" }}>Code</th>
                <th style={{ padding: "10px", borderBottom: "1px solid #eee" }}>Name</th>
                <th style={{ padding: "10px", borderBottom: "1px solid #eee" }}>Price</th>
                <th style={{ padding: "10px", borderBottom: "1px solid #eee", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {quickProducts.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px" }}><strong>{p.code}</strong></td>
                  <td style={{ padding: "10px" }}>{p.name}</td>
                  <td style={{ padding: "10px" }}>{toCurrency(p.price)}</td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    <button
                      onClick={() => handleDeleteQuickProduct(p.id)}
                      style={{ padding: "4px 8px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.85em" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {quickProducts.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                    No predefined product codes found. Add one above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
