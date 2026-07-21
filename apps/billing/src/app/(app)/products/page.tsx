"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Trash2, Search, Upload, Edit, RefreshCw } from "lucide-react";
import { formatPaise, decimalToPaise } from "@/lib/domain/gst";
import { BulkScanQueue } from "@/components/scan/bulk-scan-queue";
import { toast } from "sonner";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [hsnCode, setHsnCode] = useState("6203");
  const [gstRate, setGstRate] = useState("5");
  const [size, setSize] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/products?limit=100");
      if (r.ok) {
        const d = await r.json();
        setProducts(d.products || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !price) {
      toast.error("Code, Name, and Price are required");
      return;
    }

    try {
      const r = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          pricePaise: decimalToPaise(price),
          hsnCode,
          gstRate: Number(gstRate),
          size,
        }),
      });

      if (r.ok) {
        toast.success("Product saved to library");
        setCode("");
        setName("");
        setPrice("");
        setSize("");
        void loadProducts();
      } else {
        toast.error("Failed to save product");
      }
    } catch {
      toast.error("Error saving product");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const r = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (r.ok) {
        toast.success("Product deleted");
        void loadProducts();
      }
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const filtered = products.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Package className="text-[var(--accent)]" /> Product Library
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage store catalog, SKUs, HSN codes, and default GST rates
          </p>
        </div>
      </div>

      {/* Bulk Scan Queue Section */}
      <BulkScanQueue />

      {/* Manual Add Form */}
      <form onSubmit={handleSave} className="card p-4 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add / Edit Product Master</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">SKU / Code *</label>
            <input
              className="field h-10 text-xs font-mono uppercase font-bold"
              placeholder="e.g. TEE-01"
              value={code}
              onChange={e => setCode(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">Product Name *</label>
            <input
              className="field h-10 text-xs font-semibold"
              placeholder="e.g. Oversized Purple Tee"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">Price (₹) *</label>
            <input
              className="field h-10 text-xs font-bold text-currency"
              placeholder="1199.00"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">HSN Code</label>
            <input
              className="field h-10 text-xs font-mono"
              placeholder="6203"
              value={hsnCode}
              onChange={e => setHsnCode(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-muted)] block mb-1">GST Rate</label>
            <select
              className="field h-10 text-xs font-semibold"
              value={gstRate}
              onChange={e => setGstRate(e.target.value)}
            >
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary h-10 px-5 text-xs">
            <Plus size={14} /> Add Product to Catalog
          </button>
        </div>
      </form>

      {/* Product List Table */}
      <div className="card overflow-hidden p-0">
        <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              className="field h-9 pl-8 text-xs"
              placeholder="Filter products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-[var(--text-muted)]">{filtered.length} products</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>HSN</th>
                <th>GST Rate</th>
                <th>Price</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[var(--text-dim)]">
                    No products found in library
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <span className="font-mono font-bold text-[var(--accent)] bg-[rgba(108,99,255,0.15)] px-2 py-0.5 rounded">
                        {p.code}
                      </span>
                    </td>
                    <td className="font-semibold text-[var(--text)]">{p.name}</td>
                    <td className="font-mono text-[var(--text-muted)]">{p.hsnCode || "6203"}</td>
                    <td>
                      <span className={`gst-badge gst-${p.gstRate}`}>{p.gstRate}%</span>
                    </td>
                    <td className="font-bold text-[var(--green)]">{formatPaise(p.pricePaise)}</td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-[var(--red)] hover:text-white p-1 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
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
