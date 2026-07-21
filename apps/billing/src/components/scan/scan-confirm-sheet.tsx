"use client";

import { useState } from "react";
import { AlertTriangle, Check, RefreshCw, ShoppingCart, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParsedTagResult } from "@/lib/ocr/tag-parser";

interface ScanConfirmSheetProps {
  parsed: ParsedTagResult;
  imagePreviewUrl?: string | null;
  onConfirmAddToCart?: (data: { code: string; name: string; price: string; size: string }) => void;
  onConfirmAddToLibrary?: (data: { code: string; name: string; price: string; size: string }) => void;
  onDismiss: () => void;
  existingProductMatch?: { id: string; name: string; price: string; stock?: number | null } | null;
  onUpdateStock?: (productId: string, qty: number) => void;
}

export function ScanConfirmSheet({
  parsed,
  imagePreviewUrl,
  onConfirmAddToCart,
  onConfirmAddToLibrary,
  onDismiss,
  existingProductMatch,
  onUpdateStock,
}: ScanConfirmSheetProps) {
  const [code, setCode] = useState(parsed.code);
  const [name, setName] = useState(parsed.name);
  const [price, setPrice] = useState(parsed.price);
  const [size, setSize] = useState(parsed.size);

  const { fieldConfidence } = parsed;

  const isLowCode = fieldConfidence.code < 70;
  const isLowName = fieldConfidence.name < 70;
  const isLowPrice = fieldConfidence.price < 70;
  const isLowSize = fieldConfidence.size < 70;

  const isLowOverall = parsed.confidence < 70 || isLowCode || isLowPrice;

  return (
    <div className="bottom-sheet-backdrop" onClick={onDismiss}>
      <div
        className="bottom-sheet max-w-lg mx-auto bg-[var(--bg-card)] border-t border-[var(--border)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="sheet-handle" />

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏷️</span>
            <h3 className="text-base font-bold text-[var(--text)]">Review Scanned Tag</h3>
          </div>
          {isLowOverall && (
            <span className="flex items-center gap-1 text-xs font-semibold text-[var(--amber)] bg-[var(--amber-bg)] px-2 py-0.5 rounded-full">
              <AlertTriangle size={12} /> Double-check red fields
            </span>
          )}
        </div>

        {/* Existing product match alert */}
        {existingProductMatch && (
          <div className="mb-4 p-3 rounded-lg bg-[rgba(108,99,255,0.12)] border border-[var(--accent)] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[var(--accent)]">Matching product found in library!</p>
              <p className="text-xs text-[var(--text-muted)]">
                {existingProductMatch.name} (₹{existingProductMatch.price})
              </p>
            </div>
            {onUpdateStock && (
              <button
                className="btn-primary py-1.5 px-3 text-xs"
                onClick={() => onUpdateStock(existingProductMatch.id, 1)}
              >
                <RefreshCw size={12} /> Update Stock (+1)
              </button>
            )}
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-3">
          {/* Image thumbnail + Name */}
          <div className="flex gap-3">
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Scanned Tag"
                className="w-16 h-16 rounded-lg object-cover border border-[var(--border)] flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Product Name {isLowName && <span className="text-[var(--red)]">*</span>}
              </label>
              <input
                className={cn("field h-10 text-sm font-semibold", isLowName && "field-error bg-[rgba(239,68,68,0.08)]")}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Product name"
              />
            </div>
          </div>

          {/* Code + Price + Size */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Code/SKU {isLowCode && <span className="text-[var(--red)]">*</span>}
              </label>
              <input
                className={cn(
                  "field h-10 text-xs font-mono font-bold uppercase",
                  isLowCode && "field-error bg-[rgba(239,68,68,0.08)]"
                )}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="SKU"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Price (₹) {isLowPrice && <span className="text-[var(--red)]">*</span>}
              </label>
              <input
                className={cn(
                  "field h-10 text-xs font-bold text-currency",
                  isLowPrice && "field-error bg-[rgba(239,68,68,0.08)]"
                )}
                value={price}
                onChange={e => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                Size {isLowSize && <span className="text-[var(--red)]">*</span>}
              </label>
              <input
                className={cn("field h-10 text-xs font-bold uppercase", isLowSize && "field-error bg-[rgba(239,68,68,0.08)]")}
                value={size}
                onChange={e => setSize(e.target.value.toUpperCase())}
                placeholder="S/M/L"
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button className="btn-ghost flex-1 h-11 text-xs" onClick={onDismiss}>
            Cancel
          </button>

          {onConfirmAddToLibrary && (
            <button
              className="btn-ghost flex-1 h-11 text-xs border-[var(--accent)] text-[var(--accent)]"
              onClick={() => onConfirmAddToLibrary({ code, name, price, size })}
            >
              <Package size={14} /> Add to Library
            </button>
          )}

          {onConfirmAddToCart && (
            <button
              className="btn-primary flex-1 h-11 text-xs"
              onClick={() => onConfirmAddToCart({ code, name, price, size })}
            >
              <ShoppingCart size={14} /> Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
