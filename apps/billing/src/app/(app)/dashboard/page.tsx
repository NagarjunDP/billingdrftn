"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Receipt,
  Download,
  Calendar,
  Layers,
  ShoppingBag,
} from "lucide-react";
import { formatPaise } from "@/lib/domain/gst";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const [fromDate, setFromDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/dashboard/stats?from=${fromDate}&to=${toDate}`);
      if (r.ok) {
        const d = await r.json();
        setStats(d);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const chartData = (stats?.dailyTrend || []).map((t: any) => ({
    date: t.date,
    Sales: Number(t.salesPaise) / 100,
    Tax: Number(t.taxPaise) / 100,
  }));

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <BarChart3 className="text-[var(--accent)]" /> Revenue & GST Dashboard
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time analytics, tax collection split, and daily trends
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            className="field h-9 text-xs w-36 font-semibold"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
          <span className="text-xs text-[var(--text-dim)]">to</span>
          <input
            type="date"
            className="field h-9 text-xs w-36 font-semibold"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
          <button className="btn-primary h-9 px-3 text-xs" onClick={loadStats}>
            Apply Filter
          </button>
          <a
            className="btn-ghost h-9 px-3 text-xs border-[var(--accent)] text-[var(--accent)]"
            href={`/api/gst/export?from=${fromDate}&to=${toDate}&type=revenue_csv`}
            target="_blank"
          >
            <Download size={14} /> Export CSV
          </a>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Sales */}
        <div className="card p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Today Sales</span>
            <TrendingUp size={16} className="text-[var(--green)]" />
          </div>
          <p className="text-2xl font-black text-[var(--green)]">
            {loading ? <span className="skeleton w-24 h-7 inline-block" /> : formatPaise(stats?.todaySalesPaise || 0)}
          </p>
          <p className="text-[11px] text-[var(--text-dim)]">{stats?.todayInvoiceCount || 0} orders today</p>
        </div>

        {/* Card 2: Period Revenue */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Period Revenue</span>
            <DollarSign size={16} className="text-[var(--accent)]" />
          </div>
          <p className="text-2xl font-black text-white">
            {loading ? <span className="skeleton w-24 h-7 inline-block" /> : formatPaise(stats?.periodRevenuePaise || 0)}
          </p>
          <p className="text-[11px] text-[var(--text-dim)]">{stats?.periodInvoiceCount || 0} invoices total</p>
        </div>

        {/* Card 3: Total GST Collected */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">GST Collected</span>
            <Receipt size={16} className="text-[var(--amber)]" />
          </div>
          <p className="text-2xl font-black text-[var(--amber)]">
            {loading ? <span className="skeleton w-24 h-7 inline-block" /> : formatPaise(stats?.totalGstCollectedPaise || 0)}
          </p>
          <p className="text-[11px] text-[var(--text-dim)]">Tax collected for filing</p>
        </div>

        {/* Card 4: CGST/SGST/IGST Split */}
        <div className="card p-4 space-y-1 text-xs">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Tax Breakdown
          </span>
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>CGST:</span>
            <span className="font-mono text-white">{formatPaise(stats?.periodCgstPaise || 0)}</span>
          </div>
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>SGST:</span>
            <span className="font-mono text-white">{formatPaise(stats?.periodSgstPaise || 0)}</span>
          </div>
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>IGST:</span>
            <span className="font-mono text-white">{formatPaise(stats?.periodIgstPaise || 0)}</span>
          </div>
        </div>
      </div>

      {/* Daily Trend Chart (Recharts) */}
      <div className="card p-4 lg:p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daily Sales & Tax Trend</h3>

        <div className="h-72 w-full">
          {loading ? (
            <div className="h-full w-full skeleton" />
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[var(--text-dim)]">
              No sales data available for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a40" vertical={false} />
                <XAxis dataKey="date" stroke="#8888aa" fontSize={10} tickLine={false} />
                <YAxis stroke="#8888aa" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a26",
                    borderColor: "#2a2a40",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, ""]}
                />
                <Bar dataKey="Sales" fill="#6c63ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tax" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Products Table */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag size={16} className="text-[var(--accent)]" /> Top Selling Apparel Products
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>#</th>
                <th>Product Name</th>
                <th>Quantity Sold</th>
                <th>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {!stats?.topProducts || stats.topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-[var(--text-dim)]">
                    No product sales recorded in this period
                  </td>
                </tr>
              ) : (
                stats.topProducts.map((p: any, idx: number) => (
                  <tr key={idx}>
                    <td className="font-bold text-[var(--text-muted)]">{idx + 1}</td>
                    <td className="font-bold text-white">{p.productName}</td>
                    <td className="font-mono text-white">{p.totalQty} pcs</td>
                    <td className="font-bold text-[var(--green)]">{formatPaise(p.totalRevenuePaise)}</td>
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
