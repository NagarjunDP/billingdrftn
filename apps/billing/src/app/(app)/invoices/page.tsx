"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Eye, Calendar, Filter, MessageCircle } from "lucide-react";
import { formatPaise } from "@/lib/domain/gst";
import Link from "next/link";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/invoices?status=${statusFilter}` : "/api/invoices";
      const r = await fetch(url);
      if (r.ok) {
        const d = await r.json();
        setInvoices(d.invoices || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, [statusFilter]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <FileText className="text-[var(--accent)]" /> Digital Invoices Register
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Persisted tax invoices, line items, buyer details, and tax breakdowns
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 items-center">
          <Filter size={14} className="text-[var(--text-muted)]" />
          <select
            className="field h-9 text-xs font-semibold w-36"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Buyer Phone</th>
                <th>Buyer Name</th>
                <th>Payment</th>
                <th>Taxable</th>
                <th>GST</th>
                <th>Grand Total</th>
                <th className="text-right">PDF</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-[var(--text-muted)]">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-[var(--text-dim)]">
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const dateStr = new Date(inv.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const gstTotal = (inv.totalCgstPaise || 0) + (inv.totalSgstPaise || 0) + (inv.totalIgstPaise || 0);

                  return (
                    <tr key={inv.id}>
                      <td>
                        <span className="font-mono font-bold text-[var(--accent)] bg-[rgba(108,99,255,0.15)] px-2 py-0.5 rounded">
                          {inv.invoiceNumber || "DRAFT"}
                        </span>
                      </td>
                      <td className="text-[var(--text-muted)]">{dateStr}</td>
                      <td className="font-mono text-white">{inv.buyerPhone ? `+91 ${inv.buyerPhone}` : "-"}</td>
                      <td className="font-medium text-white">{inv.buyerName || "Walk-in"}</td>
                      <td>
                        <span className="uppercase font-bold text-[10px] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
                          {inv.paymentMode}
                        </span>
                      </td>
                      <td>{formatPaise(inv.taxableValuePaise || 0)}</td>
                      <td className="text-[var(--text-muted)]">{formatPaise(gstTotal)}</td>
                      <td className="font-bold text-[var(--green)]">{formatPaise(inv.grandTotalPaise || 0)}</td>
                      <td className="text-right">
                        <a
                          className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline font-semibold"
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download size={14} /> Tax PDF
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
