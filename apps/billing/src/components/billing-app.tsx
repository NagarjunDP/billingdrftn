"use client";

import { ChangeEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
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
    </main>
  );
}
