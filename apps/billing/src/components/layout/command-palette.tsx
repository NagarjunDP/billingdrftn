"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Command, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  code: string;
  name: string;
  price_paise: number;
  gst_rate: number;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const router = useRouter();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery("");
        setResults([]);
        setSelected(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Search products
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=6`);
        if (r.ok) { const d = await r.json(); setResults(d.products || []); }
      } finally { setLoading(false); }
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelect = useCallback((product: Product) => {
    setOpen(false);
    router.push(`/sale?product=${product.id}`);
  }, [router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) { handleSelect(results[selected]); }
  }, [results, selected, handleSelect]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={cn(
          "relative w-full max-w-lg mx-4 animate-fade-in",
          "bg-[var(--bg-elevated)] border border-[var(--border)]",
          "rounded-[var(--radius)] overflow-hidden shadow-2xl"
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <Search size={18} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-[var(--text)] placeholder:text-[var(--text-dim)] text-sm outline-none"
            placeholder="Search products by name or code..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="text-[10px] text-[var(--text-dim)] bg-[var(--bg-card)] border border-[var(--border)] px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">
              Searching...
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">
              No products found for &ldquo;{query}&rdquo;
            </div>
          )}
          {results.map((p, i) => (
            <button
              key={p.id}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100",
                i === selected ? "bg-[rgba(108,99,255,0.12)]" : "hover:bg-[var(--bg-card)]",
                "border-b border-[var(--border-soft)] last:border-0"
              )}
              onClick={() => handleSelect(p)}
              onMouseEnter={() => setSelected(i)}
            >
              <span className="text-xs font-mono font-bold text-[var(--accent)] bg-[rgba(108,99,255,0.15)] px-1.5 py-0.5 rounded flex-shrink-0">
                {p.code}
              </span>
              <span className="flex-1 text-sm text-[var(--text)] truncate">{p.name}</span>
              <span className="text-sm font-bold text-[var(--green)] text-currency flex-shrink-0">
                ₹{(p.price_paise / 100).toFixed(2)}
              </span>
              <ArrowRight size={14} className="text-[var(--text-muted)] flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Footer hint */}
        {!query && (
          <div className="px-4 py-3 border-t border-[var(--border)] flex items-center gap-4 text-xs text-[var(--text-dim)]">
            <span className="flex items-center gap-1"><Command size={10} /> K to open</span>
            <span>↑↓ navigate</span>
            <span>↵ add to sale</span>
          </div>
        )}
      </div>
    </div>
  );
}
