"use client";

import { useState, useEffect } from "react";
import { FileSpreadsheet, Download, Layers, Check, Calendar, FileText } from "lucide-react";
import { formatPaise } from "@/lib/domain/gst";

export default function GSTFilingPage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/gst/gstr1?period=${period}`);
      if (r.ok) {
        const d = await r.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [period]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <FileSpreadsheet className="text-[var(--accent)]" /> GSTR-1 GST Filing Summary
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            B2B / B2C split, HSN-wise tax breakdown, and audit exports
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="month"
            className="field h-9 text-xs w-40 font-semibold"
            value={period}
            onChange={e => setPeriod(e.target.value)}
          />
          <a
            className="btn-primary h-9 px-3 text-xs"
            href={`/api/gst/export?from=${period}-01&to=${period}-31&format=csv`}
            target="_blank"
          >
            <Download size={14} /> GSTR-1 CSV
          </a>
          <a
            className="btn-ghost h-9 px-3 text-xs border-[var(--accent)] text-[var(--accent)]"
            href={`/api/gst/export?from=${period}-01&to=${period}-31&format=xlsx`}
            target="_blank"
          >
            <Download size={14} /> Excel Register
          </a>
        </div>
      </div>

      {/* B2B vs B2C Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* B2B Summary */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">B2B Sales (With Customer GSTIN)</h3>
            <span className="text-xs font-mono font-bold text-[var(--accent)] bg-[rgba(108,99,255,0.15)] px-2 py-0.5 rounded">
              {data?.b2bSummary?.count || 0} Invoices
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Taxable Value:</span>
              <span className="font-mono text-white">{formatPaise(data?.b2bSummary?.taxablePaise || 0)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>CGST + SGST:</span>
              <span className="font-mono text-white">
                {formatPaise((data?.b2bSummary?.cgstPaise || 0) + (data?.b2bSummary?.sgstPaise || 0))}
              </span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>IGST:</span>
              <span className="font-mono text-white">{formatPaise(data?.b2bSummary?.igstPaise || 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-[var(--green)] pt-2 border-t border-[var(--border)]">
              <span>B2B Total Value:</span>
              <span>{formatPaise(data?.b2bSummary?.totalPaise || 0)}</span>
            </div>
          </div>
        </div>

        {/* B2C Summary */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">B2C Retail Sales (Walk-in / Consumers)</h3>
            <span className="text-xs font-mono font-bold text-[var(--accent)] bg-[rgba(108,99,255,0.15)] px-2 py-0.5 rounded">
              {data?.b2cSummary?.count || 0} Invoices
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Taxable Value:</span>
              <span className="font-mono text-white">{formatPaise(data?.b2cSummary?.taxablePaise || 0)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>CGST + SGST:</span>
              <span className="font-mono text-white">
                {formatPaise((data?.b2cSummary?.cgstPaise || 0) + (data?.b2cSummary?.sgstPaise || 0))}
              </span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>IGST:</span>
              <span className="font-mono text-white">{formatPaise(data?.b2cSummary?.igstPaise || 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-[var(--green)] pt-2 border-t border-[var(--border)]">
              <span>B2C Total Value:</span>
              <span>{formatPaise(data?.b2cSummary?.totalPaise || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* HSN Code Summary Table */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">HSN / SAC Summary Table (Required for GSTR-1)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>HSN Code</th>
                <th>GST Rate</th>
                <th>Total Quantity</th>
                <th>Taxable Value</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>IGST</th>
                <th>Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-[var(--text-muted)]">
                    Calculating HSN summary...
                  </td>
                </tr>
              ) : !data?.hsnSummary || data.hsnSummary.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-[var(--text-dim)]">
                    No transactions in this period
                  </td>
                </tr>
              ) : (
                data.hsnSummary.map((h: any, idx: number) => (
                  <tr key={idx}>
                    <td className="font-mono font-bold text-[var(--accent)]">{h.hsnCode}</td>
                    <td>
                      <span className={`gst-badge gst-${h.gstRate}`}>{h.gstRate}%</span>
                    </td>
                    <td className="font-mono text-white">{h.totalQuantity} pcs</td>
                    <td>{formatPaise(h.taxablePaise)}</td>
                    <td className="text-[var(--text-muted)]">{formatPaise(h.cgstPaise)}</td>
                    <td className="text-[var(--text-muted)]">{formatPaise(h.sgstPaise)}</td>
                    <td className="text-[var(--text-muted)]">{formatPaise(h.igstPaise)}</td>
                    <td className="font-bold text-[var(--green)]">{formatPaise(h.totalTaxPaise)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
