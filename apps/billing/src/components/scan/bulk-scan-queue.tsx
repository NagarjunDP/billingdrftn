"use client";

import { useState } from "react";
import { ParsedTagResult } from "@/lib/ocr/tag-parser";
import { OCRScannerModal } from "./ocr-scanner-modal";
import { Plus, Trash2, CheckCircle2, Layers } from "lucide-react";
import { formatPaise } from "@/lib/domain/gst";

interface QueueItem {
  id: string;
  code: string;
  name: string;
  price: string;
  size: string;
  confidence: number;
}

export function BulkScanQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleScanItem = (item: { code: string; name: string; price: string; size: string }) => {
    const newItem: QueueItem = {
      id: "scan_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
      ...item,
      confidence: 85,
    };
    setQueue(prev => [...prev, newItem]);
  };

  const handleRemove = (id: string) => {
    setQueue(prev => prev.filter(i => i.id !== id));
  };

  const handleBulkSave = async () => {
    if (queue.length === 0) return;
    setIsSaving(true);
    let successCount = 0;

    for (const item of queue) {
      try {
        const r = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: item.code,
            name: item.name,
            price: item.price,
            size: item.size,
          }),
        });
        if (r.ok) successCount++;
      } catch {
        /* skip */
      }
    }

    setIsSaving(false);
    alert(`Successfully added ${successCount} products to the library!`);
    setQueue([]);
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--text)]">Bulk Tag Scan Queue</h3>
          <span className="text-xs bg-[var(--bg-elevated)] text-[var(--text-muted)] px-2 py-0.5 rounded-full font-mono">
            {queue.length} items
          </span>
        </div>

        <button
          className="btn-primary py-1.5 px-3 text-xs"
          onClick={() => setIsScannerOpen(true)}
        >
          <Plus size={14} /> Scan Next Tag
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-[var(--border-soft)] rounded-lg">
          <p className="text-xs text-[var(--text-muted)]">
            Scan multiple price tags in a row, review them all together, and bulk save to Product Library.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-soft)] text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-[var(--accent)] bg-[rgba(108,99,255,0.15)] px-1.5 py-0.5 rounded">
                  {item.code}
                </span>
                <span className="font-semibold text-[var(--text)]">{item.name}</span>
                <span className="text-[var(--text-muted)]">({item.size})</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-[var(--green)]">₹{item.price}</span>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-[var(--red)] hover:text-white p-1 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              className="btn-success py-2 px-4 text-xs font-bold"
              onClick={handleBulkSave}
              disabled={isSaving}
            >
              <CheckCircle2 size={14} /> Save All {queue.length} Items to Library
            </button>
          </div>
        </div>
      )}

      {/* OCR Scanner Modal */}
      <OCRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddToLibrary={handleScanItem}
      />
    </div>
  );
}
